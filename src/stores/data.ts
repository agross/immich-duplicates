import { defineStore } from 'pinia'

export const useDataStore = defineStore('data', {
  state: () => ({
    duplicates: {} as { [groupId: string]: string[] }
  }),
  actions: {
    removeGroup(groupId: string) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [groupId]: removed, ...rest } = this.duplicates

      this.duplicates = rest
    }
  },
  persist: true
})
