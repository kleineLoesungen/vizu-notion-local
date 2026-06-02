// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  ssr: true,
  runtimeConfig: {
    // Server-only: NEVER exposed to client
    notionApiToken: process.env.NOTION_API_TOKEN || '',
  },
  nitro: {
    preset: 'node-server',
  },
})
