const TOKEN_KEY = 'mongopanel_token'
const USER_KEY = 'mongopanel_user'

export const useAuth = () => {
  const token = useState<string | null>('auth_token', () => {
    if (import.meta.client) return localStorage.getItem(TOKEN_KEY)
    return null
  })
  const user = useState<{ username: string } | null>('auth_user', () => {
    if (import.meta.client) {
      const stored = localStorage.getItem(USER_KEY)
      return stored ? JSON.parse(stored) : null
    }
    return null
  })

  const isAuthenticated = computed(() => !!token.value)

  const login = async (username: string, password: string) => {
    const data = await $fetch<{ token: string; username: string }>('/api/auth/login', {
      method: 'POST',
      body: { username, password },
    })
    token.value = data.token
    user.value = { username: data.username }
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify({ username: data.username }))
  }

  const logout = () => {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    navigateTo('/login')
  }

  const apiFetch = <T>(url: string, options?: Parameters<typeof $fetch>[1]) => {
    return $fetch<T>(url, {
      ...options,
      headers: {
        ...((options?.headers as Record<string, string>) || {}),
        Authorization: `Bearer ${token.value}`,
      },
    })
  }

  return { token, user, isAuthenticated, login, logout, apiFetch }
}
