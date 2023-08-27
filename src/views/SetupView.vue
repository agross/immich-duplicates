<script setup lang="ts">
import { ref } from 'vue'
import router from '@/router'

import { useApiStore } from '@/stores/api'
import { useDataStore } from '@/stores/data'

const api = useApiStore()
const data = useDataStore()

const endpoint = ref(api.endpoint)
const apiKey = ref(api.apiKey)
const duplicates = ref(JSON.stringify(data.duplicates))
const message = ref<string>('')

function setUpStores() {
  api.endpoint = endpoint.value
  api.apiKey = apiKey.value

  data.duplicates = JSON.parse(duplicates.value)

  if (Object.keys(data.duplicates).length) {
    router.push('/')
  } else {
    message.value = 'No data'
  }
}
</script>

<template>
  <main>
    <h1>Setup</h1>

    <h2>Immich API</h2>
    <section>
      <label for="endpoint">Endpoint URL (including <code>/api</code>)</label>
      <input v-model="endpoint" type="text" name="endpoint" />
    </section>
    <section>
      <label for="endpoint">API Key</label>
      <input v-model="apiKey" type="text" name="apiKey" />
    </section>

    <h2>JSON document with duplicates</h2>
    <section>
      <label for="duplicates">The format is <code>string[][]</code></label>
      <textarea name="duplicates" v-model="duplicates"></textarea>
    </section>

    <button @click="setUpStores">OK</button>

    <p>{{ message }}</p>
  </main>
</template>

<style scoped>
h2 {
  margin-top: 2rem;
}
section {
  margin-top: 1rem;
}
label {
  display: block;
}

input,
textarea {
  width: 100%;
}

textarea {
  height: 20rem;
}
</style>
