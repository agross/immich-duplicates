<script setup lang="ts">
import { onBeforeMount, onBeforeUnmount } from 'vue'

import { useDataStore } from '@/stores/data'
import router from '@/router'

import DuplicateGroup from '../components/DuplicateGroup.vue'
import KeyChar from '../components/KeyChar.vue'

const props = defineProps<{
  index: number
}>()

const data = useDataStore()

function hasPrevious() {
  if (props.index > 0) {
    return props.index - 1
  }

  return false
}

function previous() {
  const previous = hasPrevious()

  if (previous !== false) {
    router.push(`/${previous}`)
  }
}

function hasNext() {
  const nextIndex = props.index + 1

  if (data.duplicates[nextIndex]) {
    return nextIndex
  }

  return false
}

function next() {
  const next = hasNext()

  if (next !== false) {
    router.push(`/${next}`)
  }
}

function keyDown(ev: KeyboardEvent) {
  switch (ev.key) {
    case 'ArrowLeft':
      previous()
      break
    case 'ArrowRight':
      next()
      break
  }
}

onBeforeMount(() => {
  window.addEventListener('keydown', keyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', keyDown)
})
</script>

<template>
  <main>
    <header>{{ Object.keys(data.duplicates).length }} Groups</header>

    <button @click="router.push('/setup')">Setup</button>
    <button :disabled="hasPrevious() === false" @click="previous()">
      <KeyChar>←</KeyChar>
      Previous
    </button>
    <button :disabled="hasNext() === false" @click="next()">Next <KeyChar>→</KeyChar></button>
    <section>
      <DuplicateGroup
        v-if="data.duplicates[index]"
        :key="data.duplicates[index].join()"
        :group-index="index"
        :asset-ids="data.duplicates[index]"
      />
    </section>
  </main>
</template>

<style scoped>
button[disabled] {
  display: none;
}
</style>
