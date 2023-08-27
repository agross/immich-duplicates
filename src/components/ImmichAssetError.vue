<script setup lang="ts">
defineProps<{
  assetId: string
  error: string
}>()
</script>

<template>
  <div class="asset">
    <p>ID {{ assetId }}</p>
    <p>{{ error }}</p>
  </div>
</template>

<style scoped>

.asset {
  border: 2px solid lightcoral;
  border-radius: 5px;
  padding: 1rem;
}
</style>
