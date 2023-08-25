<script setup lang="ts">
import { computed, onBeforeMount, onBeforeUnmount } from 'vue'

import { useDataStore } from '@/stores/data'
import router from '@/router'

import DuplicateGroup from '../components/DuplicateGroup.vue'
import KeyChar from '../components/KeyChar.vue'

const props = defineProps<{
  id: string | undefined
}>()

const data = useDataStore()

const groupId = computed(() => {
  if (props.id && data.duplicates[props.id]) {
    return props.id
  }

  const firstGroupId = Object.keys(data.duplicates)[0]
  router.replace(`/${firstGroupId}`)
  return firstGroupId
})

function surroundingGroupId(direction: (index: number) => number): string | undefined {
  const index = Object.keys(data.duplicates).indexOf(groupId.value)

  const surround = direction(index)

  return Object.keys(data.duplicates)[surround]
}

function previous() {
  const previous = hasPrevious()

  if (previous) {
    router.push(`/${previous}`)
  }
}

function hasPrevious() {
  return surroundingGroupId((x) => x - 1)
}

function next() {
  const next = hasNext()

  if (next) {
    router.push(`/${next}`)
  }
}

function hasNext() {
  return surroundingGroupId((x) => x + 1)
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

    <button @click="router.push('/setup')">
      Setup
    </button>
    <button :disabled="hasPrevious() == undefined" @click="previous()">
      <KeyChar>←</KeyChar>
      Previous
    </button>
    <button :disabled="hasNext() === undefined" @click="next()">Next <KeyChar>→</KeyChar></button>
    <section>
      <DuplicateGroup :key="groupId" :group-id="groupId" :asset-ids="data.duplicates[groupId]" />
    </section>
  </main>
</template>

<style>
.key {
  border: 1px solid yellowgreen;
  padding: 0.2rem;
}
</style>

<style scoped>
button[disabled] {
  display: none;
}
</style>
