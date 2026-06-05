<script setup lang="ts">
import { DatabaseIcon, ServerIcon, ActivityIcon, HardDriveIcon } from '@lucide/vue'

definePageMeta({ middleware: 'auth' })

const { apiFetch } = useAuth()

const { data: stats, pending } = await useAsyncData('stats', () =>
  apiFetch<{
    totalDatabases: number
    totalSize: number
    connections: { current: number; available: number }
    version: string
    uptime: number
    host: string
  }>('/api/databases/stats')
)

const { data: dbData } = await useAsyncData('databases-home', () =>
  apiFetch<{ databases: Array<{ name: string; sizeOnDisk: number }> }>('/api/databases')
)

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

const formatUptime = (seconds: number) => {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}j ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-foreground">Dashboard</h1>
      <p class="text-muted-foreground text-sm mt-0.5">Vue d'ensemble de votre instance MongoDB</p>
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-card border rounded-xl p-5 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-muted-foreground">Bases de données</span>
          <div class="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <DatabaseIcon class="w-5 h-5 text-blue-600" />
          </div>
        </div>
        <div class="text-3xl font-bold">{{ stats?.totalDatabases ?? '—' }}</div>
      </div>

      <div class="bg-card border rounded-xl p-5 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-muted-foreground">Taille totale</span>
          <div class="w-9 h-9 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
            <HardDriveIcon class="w-5 h-5 text-purple-600" />
          </div>
        </div>
        <div class="text-3xl font-bold">{{ stats ? formatBytes(stats.totalSize) : '—' }}</div>
      </div>

      <div class="bg-card border rounded-xl p-5 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-muted-foreground">Connexions actives</span>
          <div class="w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <ActivityIcon class="w-5 h-5 text-green-600" />
          </div>
        </div>
        <div class="text-3xl font-bold">{{ stats?.connections?.current ?? '—' }}</div>
        <p v-if="stats" class="text-xs text-muted-foreground">{{ stats.connections.available }} disponibles</p>
      </div>

      <div class="bg-card border rounded-xl p-5 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-muted-foreground">Uptime</span>
          <div class="w-9 h-9 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
            <ServerIcon class="w-5 h-5 text-amber-600" />
          </div>
        </div>
        <div class="text-3xl font-bold">{{ stats ? formatUptime(stats.uptime) : '—' }}</div>
        <p v-if="stats" class="text-xs text-muted-foreground">MongoDB {{ stats.version }}</p>
      </div>
    </div>

    <!-- Server info + Recent databases -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Server info -->
      <div class="bg-card border rounded-xl p-6">
        <h2 class="font-semibold mb-4">Informations serveur</h2>
        <dl class="space-y-3 text-sm">
          <div class="flex justify-between">
            <dt class="text-muted-foreground">Hôte</dt>
            <dd class="font-medium font-mono text-xs">{{ stats?.host ?? '—' }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-muted-foreground">Version MongoDB</dt>
            <dd class="font-medium">{{ stats?.version ?? '—' }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-muted-foreground">Connexions courantes</dt>
            <dd class="font-medium">{{ stats?.connections?.current ?? '—' }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-muted-foreground">Uptime</dt>
            <dd class="font-medium">{{ stats ? formatUptime(stats.uptime) : '—' }}</dd>
          </div>
        </dl>
      </div>

      <!-- Databases list -->
      <div class="bg-card border rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold">Bases de données</h2>
          <NuxtLink to="/databases" class="text-sm text-blue-600 hover:underline">Voir tout</NuxtLink>
        </div>
        <div v-if="pending" class="space-y-2">
          <div v-for="i in 4" :key="i" class="h-10 bg-muted rounded-lg animate-pulse" />
        </div>
        <div v-else-if="dbData?.databases?.length" class="space-y-2">
          <NuxtLink
            v-for="db in dbData.databases.slice(0, 6)"
            :key="db.name"
            :to="`/databases/${db.name}`"
            class="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group"
          >
            <div class="flex items-center gap-2.5">
              <DatabaseIcon class="w-4 h-4 text-blue-500" />
              <span class="text-sm font-medium">{{ db.name }}</span>
            </div>
            <span class="text-xs text-muted-foreground">{{ formatBytes(db.sizeOnDisk) }}</span>
          </NuxtLink>
        </div>
        <p v-else class="text-sm text-muted-foreground text-center py-4">Aucune base de données</p>
      </div>
    </div>
  </div>
</template>
