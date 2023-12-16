import { defineStore } from 'pinia'

import * as immich from 'immich-sdk'

export const useApiStore = defineStore('api', {
  state: () => ({
    apiKey: undefined as string | undefined,
    endpoint: undefined as string | undefined,
    baseUrlOverride: undefined as string | undefined
  }),
  getters: {
    config: (state) =>
      new immich.Configuration({
        apiKey: state.apiKey,
        basePath: state.endpoint
      }),
    baseUrl: (state) => state.baseUrlOverride || new URL(state.endpoint!).origin
  },
  persist: true
})
