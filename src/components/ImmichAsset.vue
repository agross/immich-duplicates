<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { useApiStore } from '@/stores/api'

import * as immich from 'immich-sdk'
import AssetMetadata from './AssetMetadata.vue'

const api = useApiStore()

const props = defineProps<{
  assetId: string
  meta: immich.AssetResponseDto
  albums: immich.AlbumResponseDto[]
  best: boolean
  highlightFileName: boolean
}>()

const imageUrl = ref('')


function assetPage() {
  return `${api.baseUrl}/search?q=${props.meta.originalFileName}`
}

async function downloadAsset() {
  const response = await new immich.AssetApi(api.config).downloadFile(props.assetId, undefined, {
    method: 'POST',
    responseType: 'blob'
  })

  const filename = props.meta.originalPath.split('/').reverse()[0]

  const objectUrl = window.URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = objectUrl
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
}

async function fetchThumbnail(id: string): Promise<Blob> {
  const response = await new immich.AssetApi(api.config).getAssetThumbnail(
    id,
    immich.ThumbnailFormat.Webp,
    undefined,
    { responseType: 'blob' }
  )
  return response.data
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

    <button @click="downloadAsset">Download</button>

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
