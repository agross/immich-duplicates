import { createRouter, createWebHistory } from 'vue-router'
import DuplicateGroupView from '@/views/DuplicateGroupView.vue'
import SetupView from '@/views/SetupView.vue'
import { useApiStore } from '@/stores/api'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/:id?',
      name: 'duplicate-group',
      component: DuplicateGroupView,
      props: true
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
