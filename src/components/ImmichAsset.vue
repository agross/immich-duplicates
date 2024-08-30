<script setup lang="ts">
import { ref, onMounted } from 'vue'

import {
  type AssetResponseDto,
  type AlbumResponseDto,
  AssetMediaSize,
  defaults,
  downloadAsset,
  viewAsset,
  deleteAssets
} from '@immich/sdk'

import { useApiStore } from '@/stores/api'
const api = useApiStore()
api.setupDefaults(defaults)

import AssetMetadata from './AssetMetadata.vue'

const props = defineProps<{
  assetId: string
  meta: AssetResponseDto
  albums: AlbumResponseDto[]
  best: boolean
  highlightFileName: boolean
}>()

const emit = defineEmits(['assetDeleted'])

const imageUrl = ref('')
const msg = ref('')

function assetPage() {
  return `${api.baseUrl}/photos/${props.assetId}`
}

async function download() {
  const response = await downloadAsset({ id: props.assetId })

  const filename = props.meta.originalPath.split('/').reverse()[0]

  const objectUrl = window.URL.createObjectURL(response)
  const link = document.createElement('a')
  link.href = objectUrl
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
}

async function deleteAsset() {
  try {
    await deleteAssets({ assetBulkDeleteDto: { ids: [props.assetId] } })
    emit('assetDeleted')
  } catch (err: any) {
    msg.value = `Could not delete: ${err}`
    return
  }
}

async function fetchThumbnail(id: string): Promise<Blob> {
  return await viewAsset({
    id: id,
    size: AssetMediaSize.Thumbnail
  })
}

function loaded() {
  imageUrl.value && URL.revokeObjectURL(imageUrl.value)
}

onMounted(async () => {
  imageUrl.value = URL.createObjectURL(await fetchThumbnail(props.assetId))
})
</script>

<template>
  <div class="asset" :class="{ best: best }">
    <a :href="assetPage()" target="_blank">
      <img :src="imageUrl" @load="loaded" alt="Asset thumbnail" />
    </a>

    <button @click="download">Download</button>
    <button @click="deleteAsset">Delete</button>
    <p v-if="msg.length">{{ msg }}</p>

    <AssetMetadata
      :asset-id="assetId"
      :meta="meta"
      :albums="albums"
      :best="best"
      :highlight-file-name="highlightFileName"
    />
  </div>
</template>

<style scoped>
img {
  width: 200px;
  display: block;
}
.asset {
  border: 2px solid gray;
  border-radius: 5px;
  padding: 1rem;
}
.best {
  border-color: greenyellow;
}
</style>
