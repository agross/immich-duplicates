<script setup lang="ts">
import { computed, onBeforeMount, onBeforeUnmount, onErrorCaptured, ref } from 'vue'

import { useApiStore } from '@/stores/api'
import { useDataStore } from '@/stores/data'

import * as immich from 'immich-sdk'
import ImmichAsset from './ImmichAsset.vue'

import KeyChar from './KeyChar.vue'

const props = defineProps<{
  groupId: string
  assetIds: string[]
}>()

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

const meta = ref<{ [assetId: string]: immich.AssetResponseDto }>({})
const albums = ref<{ [assetId: string]: immich.AlbumResponseDto[] }>({})

const assetIdsBySize = computed(() =>
  Object.keys(meta.value)
    .sort((a, b) => {
      const left = meta.value[a]
      const right = meta.value[b]

      return left.exifInfo!.fileSizeInByte! - right.exifInfo!.fileSizeInByte!
    })
    .reverse()
)

const bestAssetId = computed(() => assetIdsBySize.value[0])

const fileNamesAreConsideredEqual = computed(() => {
  // 2016-09-18 18.21.51
  // would be considered equal to
  // IMG_20160918_182149
  const digitsOnly = Object.values(meta.value)
    .map((x) => x.originalFileName)
    .map((x) => x.replace(/\D/g, ''))

  return [...new Set(digitsOnly)].length === 1
})

async function keepBestAsset() {
  const keep = bestAssetId.value
  const remove = props.assetIds.filter((x) => x !== keep)

  // 1. Assign to the same albums as all other assets.
  const alreadyContainedIn = albums.value[keep].map((dto) => dto.id)
  const albumIds = Object.values(albums.value)
    .flatMap((x) => x.map((dto) => dto.id))
    .filter((x) => !alreadyContainedIn.includes(x))

  const done = [...new Set(albumIds)].map(async (albumId) => {
    await albumApi.addAssetsToAlbum(albumId, { ids: [keep] } as unknown as immich.AddAssetsDto)
  })

  try {
    await Promise.all(done)
  } catch (err: any) {
    msg.value = `Could not add best asset ${keep} to album: ${err.message}`
    return
  }

  // 2. Favorite if any in the group is a favorite, unless it's already a favorite.
  if (!meta.value[keep].isFavorite) {
    const favorite = remove
      .map((x) => meta.value[x].isFavorite)
      .reduce((acc, el) => acc || el, false)

    if (favorite) {
      try {
        await assetApi.updateAsset(keep, { isFavorite: true })
      } catch (err: any) {
        msg.value = `Could not make best asset ${keep} a favorite: ${err.message}`
        return
      }
    }
  }

  // 3. Delete other assets.
  const response = await assetApi.deleteAsset({ ids: remove })
  const failures = response.data.filter((x) => x.status !== 'SUCCESS')
  if (failures.length) {
    msg.value = `Could not delete ${failures
      .map((x) => x.id)
      .map((id) => meta.value[id].originalFileName)
      .join()}`
    return
  }

  // 4. Remove from Vue store.
  ignore()
}

async function deleteAll() {
  const response = await assetApi.deleteAsset({ ids: props.assetIds })
  const failures = response.data.filter((x) => x.status !== 'SUCCESS')
  if (failures.length) {
    msg.value = `Could not delete ${failures
      .map((x) => x.id)
      .map((id) => meta.value[id].originalFileName)
      .join()}`
    return
  }

  ignore()
}

function ignore() {
  data.removeGroup(props.groupId)
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
try {
  // https://stackoverflow.com/a/75325718/149264
  await Promise.all([
    ...props.assetIds.map(async (assetId) => (meta.value[assetId] = await fetchMetadata(assetId))),
    ...props.assetIds.map(
      async (assetId) => (albums.value[assetId] = await fetchAlbumInfo(assetId))
    )
  ])
} catch (err: any) {
  const persons = await Promise.all(props.assetIds.map(async (assetId) => await isPerson(assetId)))

  if (persons.filter((x) => x === true).length > 0) {
    ignore()
  }
}
</script>

<template>
  <div>
    <p>Group {{ groupId }} with {{ assetIds.length }} assets</p>
    <button @click="keepBestAsset()">Keep best asset <KeyChar>K</KeyChar></button>
    <button @click="ignore()">Ignore <KeyChar>I</KeyChar></button>
    <button @click="deleteAll()">Delete all</button>
    <p v-if="msg.length">{{ msg }}</p>
    <div class="assets">
      <Suspense>
        <ImmichAsset
          v-for="assetId in assetIdsBySize"
          :key="assetId"
          :asset-id="assetId"
          :meta="meta[assetId]"
          :albums="albums[assetId]"
          :best="bestAssetId == assetId"
          :highlight-file-name="fileNamesAreConsideredEqual"
        />
        <template #fallback> Loading... </template>
      </Suspense>
    </div>
  </div>
</template>

<style scoped>
.assets {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}
</style>
