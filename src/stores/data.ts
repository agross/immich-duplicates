import { defineStore } from 'pinia'

export const useDataStore = defineStore('data', {
  state: () => ({
    duplicates: [] as string[][]
  }),
  actions: {
    removeGroup(groupIndex: number) {
      this.duplicates.splice(groupIndex, 1)
    }
  },
  persist: true
})
