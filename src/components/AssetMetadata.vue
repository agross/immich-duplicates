<script setup lang="ts">
import { computed } from 'vue'

import type { AssetResponseDto, AlbumResponseDto } from '@immich/sdk';
import { defaults} from '@immich/sdk'

import { useApiStore } from '@/stores/api'
useApiStore().setupDefaults(defaults)

const props = defineProps<{
  assetId: string
  meta: AssetResponseDto
  albums: AlbumResponseDto[]
  best: boolean
  highlightFileName: boolean
}>()

const api = useApiStore()

function albumPage(albumId: string) {
  return `${api.baseUrl}/albums/${albumId}`
}

const fileSize = computed(() => {
  const bytes = props.meta?.exifInfo?.fileSizeInByte
  if (!bytes) {
    return 'Unknown'
  }

  return Math.round(bytes / 1024)
})

const resolution = computed(
  () => `${props.meta?.exifInfo?.exifImageHeight}x${props.meta?.exifInfo?.exifImageWidth}`
)

const isFavorite = computed(() => props.meta.isFavorite)
</script>

<template>
  <div class="meta">
    <p>
      {{ meta?.type }}
      <span :class="{ highlight: highlightFileName }">{{ meta?.originalFileName }}</span>
      <span v-if="isFavorite">🥰</span>
    </p>
    <p>
      <span :class="{ best: best }"> {{ fileSize }} KB</span> from <code>{{ meta?.deviceId }}</code>
    </p>
    <p>{{ resolution }} px<span v-if="meta.livePhotoVideoId">, <span class="highlight">live photo</span></span></p>
    <p v-if="meta?.type === 'VIDEO'">Length: {{ meta?.duration }}</p>

    <div v-if="albums?.length > 0">
      <p>Albums:</p>
      <ul>
        <li v-for="album in albums" :key="album.id">
          <a :href="albumPage(album.id)" target="_blank">
            {{ album.albumName }}
          </a>
        </li>
      </ul>
    </div>
    <div v-else>
      <p>Not in any album</p>
    </div>
  </div>
</template>

<style scoped>
.best,
.highlight {
  color: greenyellow;
}
</style>
