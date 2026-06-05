export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password } = body

  const config = useRuntimeConfig()

  if (username !== config.adminUsername || password !== config.adminPassword) {
    throw createError({ statusCode: 401, message: 'Identifiants incorrects' })
  }

  const token = await signToken({ username, role: 'admin' })
  return { token, username }
})
