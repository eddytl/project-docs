export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/login') return
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated.value) return navigateTo('/login')
})
