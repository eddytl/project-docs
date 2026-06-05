export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017',
    jwtSecret: process.env.JWT_SECRET || 'changeme-super-secret-key',
    adminUsername: process.env.ADMIN_USERNAME || 'admin',
    adminPassword: process.env.ADMIN_PASSWORD || 'admin',
    public: {}
  },
  nitro: {
    experimental: {
      wasm: false
    }
  }
})
