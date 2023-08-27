import { createRouter, createWebHistory } from 'vue-router'
import DuplicateGroupView from '@/views/DuplicateGroupView.vue'
import SetupView from '@/views/SetupView.vue'
import { useApiStore } from '@/stores/api'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/:index(\\d+)?',
      name: 'duplicate-group',
      component: DuplicateGroupView,
      props: (route) => ({ index: Number.parseInt(route.params.index as string, 10) || 0 })
    },
    {
      path: '/setup',
      name: 'setup',
      component: SetupView
    }
  ]
})

router.beforeEach(async (to) => {
  // Redirect to setup page if not set up.
  const setupPages = ['/setup']
  const setUpRequired = !setupPages.includes(to.path)
  const apiStore = useApiStore()

  if (setUpRequired && (!apiStore.apiKey || !apiStore.endpoint)) {
    return '/setup'
  }
})

export default router
