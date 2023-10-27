<script setup lang="ts">
import { computed, onBeforeMount, onBeforeUnmount, ref } from 'vue'
import axios, { AxiosError } from 'axios'

import { useApiStore } from '@/stores/api'
import { useDataStore } from '@/stores/data'

import * as immich from 'immich-sdk'
import ImmichAsset from './ImmichAsset.vue'
import ImmichAssetError from './ImmichAssetError.vue'

import KeyChar from './KeyChar.vue'

const props = defineProps<{
  groupIndex: number
  assetIds: string[]
}>()

type AssetInfo = {
  meta: immich.AssetResponseDto
  albums: immich.AlbumResponseDto[]
}

const loadedAssets = ref(new Map<string, AssetInfo>())
const assetLoadErrors = ref(new Map<string, string>())

const msg = ref('')

const data = useDataStore()

const config = useApiStore().config
const albumApi = new immich.AlbumApi(config)
const assetApi = new immich.AssetApi(config)
const personApi = new immich.PersonApi(config)

async function fetchAlbumInfo(id: string): Promise<immich.AlbumResponseDto[]> {
  const response = await albumApi.getAllAlbums(undefined, id)
  return response.data
}

async function fetchMetadata(id: string): Promise<immich.AssetResponseDto> {
  const response = await assetApi.getAssetById(id)
  return response.data
}

async function isPerson(id: string): Promise<boolean> {
  try {
    await personApi.getPerson(id)
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

const bestAssetId = computed(() => assetIdsBySize.value[0])

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

const canKeepBestAsset = computed(() => loadedAssets.value.size > 0)

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
    await albumApi.addAssetsToAlbum(albumId, { ids: [keepId] } as unknown as immich.AddAssetsDto)
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
        await assetApi.updateAsset(keepId, { isFavorite: true })
      } catch (err: any) {
        msg.value = `Could not make best asset ${keepId} a favorite: ${err.message}`
        return
      }
    }
  }

  // 3. Delete other assets.
  if (removeIds.length) {
    try {
      await assetApi.deleteAsset({ ids: removeIds })
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

  const response = await assetApi.deleteAsset({ ids: [...loadedAssets.value.keys()] })
  const failures = response.data.filter((x) => x.status !== 'SUCCESS')
  if (failures.length) {
    msg.value = `Could not delete ${failures
      .map((x) => x.id)
      .map((id) => loadedAssets.value.get(id)?.meta.originalFileName)
      .join()}`
    return
  }

  ignore()
}

function ignore() {
  data.removeGroup(props.groupIndex)
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

    loadedAssets.value.set(assetId, {
      meta: meta,
      albums: albums
    })
  } catch (err: any) {
    if (await isPerson(assetId)) {
      ignore()
    }

    let message: string = err.message

    if (axios.isAxiosError(err)) {
      const ae = err as AxiosError
      const data = ae.response?.data as any
      message += `: ${data.message}`
    }

    assetLoadErrors.value.set(assetId, message)
  }
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
