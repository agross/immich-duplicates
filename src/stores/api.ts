import { defineStore } from 'pinia'

import * as Oazapfts from '@oazapfts/runtime'

export const useApiStore = defineStore('api', {
  state: () => ({
    apiKey: undefined as string | undefined,
    endpoint: undefined as string | undefined,
    baseUrlOverride: undefined as string | undefined
  }),
  actions: {
    setupDefaults(defaults: Oazapfts.Defaults<Oazapfts.CustomHeaders>) {
      defaults.baseUrl = this.endpoint!
      defaults.headers = { 'x-api-key': this.apiKey }
    }
  },
  getters: {
    baseUrl: (state) => state.baseUrlOverride || new URL(state.endpoint!).origin
  },
  persist: true
})
