<script setup lang="ts">
import { computed, onBeforeMount, onBeforeUnmount, ref } from 'vue'

import { useDataStore } from '@/stores/data'

import type { AssetResponseDto, AlbumResponseDto } from '@immich/sdk'
import {
  addAssetsToAlbum,
  defaults,
  deleteAssets,
  getAllAlbums,
  getAssetInfo,
  getPerson,
  updateAsset
} from '@immich/sdk'
import ImmichAsset from './ImmichAsset.vue'
import ImmichAssetError from './ImmichAssetError.vue'

import KeyChar from './KeyChar.vue'

const props = defineProps<{
  groupIndex: number
  assetIds: string[]
}>()

type AssetInfo = {
  meta: AssetResponseDto
  albums: AlbumResponseDto[]
}

const loadedAssets = ref(new Map<string, AssetInfo>())
const assetLoadErrors = ref(new Map<string, string>())

const msg = ref('')

const data = useDataStore()

import { useApiStore } from '@/stores/api'
useApiStore().setupDefaults(defaults)

async function fetchAlbumInfo(id: string): Promise<AlbumResponseDto[]> {
  return await getAllAlbums({ assetId: id })
}

async function fetchMetadata(id: string): Promise<AssetResponseDto> {
  return await getAssetInfo({ id: id })
}

async function isPerson(id: string): Promise<boolean> {
  try {
    await getPerson({ id: id })
    return true
  } catch (err: any) {
    return false
  }
}

const assetIdsBySize = computed(() =>
  [...loadedAssets.value.values()]
    .map((x) => x.meta)
    .sort(
      (left, right) => (left.exifInfo?.fileSizeInByte || 0) - (right.exifInfo?.fileSizeInByte || 0)
    )
    .reverse()
    .map((x) => x.id)
)

const calculateBestAssetId = () => {
  const compareAssets = (a: AssetInfo, b: AssetInfo) => {
    // A bare-bones sorting function to bump the best-quality asset to the top:
    // - first, by image resolution
    // - then, by extension (HEIC over JPG)
    // - finally, by file size
    const widthAndHeightA = (a.meta.exifInfo?.exifImageWidth || 0) + (a.meta.exifInfo?.exifImageHeight || 0);
    const widthAndHeightB = (b.meta.exifInfo?.exifImageWidth || 0) + (b.meta.exifInfo?.exifImageHeight || 0);
    const extA = a.meta.originalPath ? a.meta.originalPath.split('.').pop()?.toLowerCase() : '';
    const extB = b.meta.originalPath ? b.meta.originalPath.split('.').pop()?.toLowerCase() : '';

    if (widthAndHeightA !== widthAndHeightB) {
      return widthAndHeightB - widthAndHeightA;
    }
    if (extA === 'heic' && extB?.startsWith('jp') && extB?.endsWith('g')) {
      return -1;
    }
    if (extA?.startsWith('jp') && extA?.endsWith('g') && extB === 'heic') {
      return 1;
    }
    return (b.meta.exifInfo?.fileSizeInByte || 0) - (a.meta.exifInfo?.fileSizeInByte || 0);
  };

  const loadedAssetsArray = [...loadedAssets.value.values()];

  const assetsWithLivePhoto = loadedAssetsArray.filter(asset => asset.meta.livePhotoVideoId);

  if (assetsWithLivePhoto.length === 1) {
    // There's only one live photo in this group; return it as best asset
    return assetsWithLivePhoto[0].meta.id;
  }

  const selectedAsset = assetsWithLivePhoto.length > 0
    ? assetsWithLivePhoto.sort(compareAssets)[0] // Return the best live photo
    : loadedAssetsArray.sort(compareAssets)[0]; // Return the best photo or video

  return selectedAsset?.meta.id;
};

const bestAssetId = computed(() => calculateBestAssetId());

const fileNamesAreConsideredEqual = computed(() => {
  // 2016-09-18 18.21.51
  // would be considered equal to
  // IMG_20160918_182149
  const digitsOnly = [...loadedAssets.value.values()]
    .map((x) => x.meta)
    .map((x) => x.originalFileName)
    .map((x) => x.replace(/\D/g, ''))

  return [...new Set(digitsOnly)].length === 1
})

const durationToSeconds = (durationString: string) => {
  const [hours, minutes, seconds] = durationString.split(':').map(parseFloat);
  return hours * 3600 + minutes * 60 + seconds;
};

const canKeepBestAsset = computed(() => {
  // We can determine the best asset to keep automatically if a group is:
  // - a mix a pictures and short (live photo) videos
  // - all videos that are of equal duration, to within 0.1 seconds
  const loadedAssetsArray = [...loadedAssets.value.values()];
  const longVideoCount = loadedAssetsArray.filter((x) => x.meta.type.toLowerCase().includes("video") && durationToSeconds(x.meta.duration) > 4).length
  const uniqueDurations = [...new Set(loadedAssetsArray.map((x) => durationToSeconds(x.meta.duration)))];
  const durationRange = Math.max(...uniqueDurations) - Math.min(...uniqueDurations);
  const pictureCount = loadedAssetsArray.filter((x) => x.meta.type.toLowerCase().includes("image")).length
  return loadedAssets.value.size > 0 && (longVideoCount === 0 || (pictureCount === 0 && (uniqueDurations.length === 1 || durationRange < 0.1)))
})

async function keepBestAsset() {
  if (!canKeepBestAsset.value) {
    return
  }

  const keepId = bestAssetId.value

  const keepInfo = loadedAssets.value.get(keepId)
  if (!keepInfo) {
    msg.value = `Could not find info for asset to keep ${keepId}`
    return
  }

  const removeIds = [...loadedAssets.value.keys()].filter((x) => x !== keepId)
  const removeInfos = new Map([...loadedAssets.value].filter(([k, v]) => k !== keepId))

  // 1. Assign to the same albums as all other assets.
  const alreadyContainedIn = keepInfo.albums.map((dto) => dto.id)
  const albumIds = [...loadedAssets.value.values()]
    .map((x) => x.albums)
    .flatMap((x) => x.map((dto) => dto.id))
    .filter((x) => !alreadyContainedIn.includes(x))

  const done = [...new Set(albumIds)].map(async (albumId) => {
    await addAssetsToAlbum({ id: albumId, bulkIdsDto: { ids: [keepId] } })
  })

  try {
    await Promise.all(done)
  } catch (err: any) {
    msg.value = `Could not add best asset ${keepId} to album: ${err.message}`
    return
  }

  // 2. Favorite if any in the group is a favorite, unless the kept asset
  // already is a favorite.
  if (!keepInfo.meta.isFavorite) {
    const anyFavorite = [...removeInfos.values()]
      .map((x) => x.meta.isFavorite)
      .reduce((acc, el) => acc || el, false)

    if (anyFavorite) {
      try {
        await updateAsset({ id: keepId, updateAssetDto: { isFavorite: true } })
      } catch (err: any) {
        msg.value = `Could not make best asset ${keepId} a favorite: ${err.message}`
        return
      }
    }
  }

  // 3. Delete other assets.
  if (removeIds.length) {
    try {
      await deleteAssets({ assetBulkDeleteDto:{ ids: removeIds }})
    } catch (err: any) {
      msg.value = `Could not delete ${removeIds
        .map((id) => removeInfos.get(id)?.meta.originalFileName)
        .join()}: ${err}`
      return
    }
  }

  // 4. Remove from Vue store.
  ignore()
}

const canDeleteAll = computed(() => loadedAssets.value.size > 0)

async function deleteAll() {
  if (!canDeleteAll.value) {
    return
  }

  const ids = [...loadedAssets.value.keys()]

  try {
    await deleteAssets({ assetBulkDeleteDto: { ids: ids } })
  } catch (err: any) {
    msg.value = `Could not delete ${ids
      .map((id) => loadedAssets.value.get(id)?.meta.originalFileName)
      .join()}: ${err}`
    return
  }

  ignore()
}

function ignore() {
  data.removeGroup(props.groupIndex)
}

function assetDeleted(assetId : string) {
  loadedAssets.value.delete(assetId)
}

function keyDown(ev: KeyboardEvent) {
  switch (ev.key.toLowerCase()) {
    case 'k':
      keepBestAsset()
      break

    case 'i':
      ignore()
      break
  }
}

onBeforeMount(() => {
  window.addEventListener('keydown', keyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', keyDown)
})

// Some asset IDs extracted from the files in the Immich /thumbs directory are for
// people (as determined by machine learning). In this case, we cannot
// load metadata or album infos and these requests will fail. In case of load
// errors check if the asset IDs are for people and auto-ignore this group.

// https://stackoverflow.com/a/75325718/149264
for (const assetId of props.assetIds) {
  try {
    const meta = await fetchMetadata(assetId)
    const albums = await fetchAlbumInfo(assetId)

    // Ignore assets in the Immich Trash.
    if (meta.isTrashed) {
      continue
    }

    loadedAssets.value.set(assetId, {
      meta: meta,
      albums: albums
    })
  } catch (err: any) {
    if (await isPerson(assetId)) {
      ignore()
    }

    let message: string = err.message
    assetLoadErrors.value.set(assetId, message)
  }
}

// If there are not enough assets left in the group because trashed assets have
// been ignored above, ignore the whole group.
if (loadedAssets.value.size < 2) {
  ignore()
}
</script>

<template>
  <div>
    <p>
      Group {{ groupIndex }} with {{ assetIds.length }} assets
      <span class="errors" v-if="assetLoadErrors.size > 0"
        >{{ assetLoadErrors.size }} failed to load</span
      >
    </p>
    <button @click="keepBestAsset()" :disabled="!canKeepBestAsset">
      Keep best asset <KeyChar>K</KeyChar>
    </button>
    <button @click="ignore()">Ignore <KeyChar>I</KeyChar></button>
    <button @click="deleteAll()" :disabled="!canDeleteAll">Delete all</button>
    <p v-if="msg.length">{{ msg }}</p>
    <div class="assets">
      <ImmichAsset
        v-for="assetId in assetIdsBySize"
        :key="assetId"
        :asset-id="assetId"
        :meta="loadedAssets.get(assetId)!.meta"
        :albums="loadedAssets.get(assetId)!.albums"
        :best="bestAssetId == assetId"
        :highlight-file-name="fileNamesAreConsideredEqual"
        @asset-deleted="assetDeleted(assetId)"
      />

      <ImmichAssetError
        v-for="[assetId, error] in assetLoadErrors"
        :key="assetId"
        :asset-id="assetId"
        :error="error"
      />
    </div>
  </div>
</template>

<style scoped>
.assets {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.errors {
  color: lightcoral;
}
</style>
