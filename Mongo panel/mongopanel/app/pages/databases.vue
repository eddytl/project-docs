<script setup lang="ts">
import { DatabaseIcon, HardDriveIcon, PlusIcon, SearchIcon } from '@lucide/vue'

definePageMeta({ middleware: 'auth' })

const { apiFetch } = useAuth()
const search = ref('')

const { data, pending, refresh } = await useAsyncData('databases', () =>
  apiFetch<{ databases: Array<{ name: string; sizeOnDisk: number; empty: boolean }> }>('/api/databases')
)

const filtered = computed(() =>
  (data.value?.databases ?? []).filter(db =>
    db.name.toLowerCase().includes(search.value.toLowerCase())
  )
)

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Bases de données</h1>
        <p class="text-muted-foreground text-sm mt-0.5">
          {{ data?.databases?.length ?? 0 }} base(s) de données
        </p>
      </div>
    </div>

    <!-- Search -->
    <div class="relative max-w-sm">
      <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        v-model="search"
        type="text"
        placeholder="Rechercher une base..."
        class="w-full pl-9 pr-4 py-2 bg-card border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
      />
    </div>

    <!-- Loading -->
    <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 6" :key="i" class="h-28 bg-card border rounded-xl animate-pulse" />
    </div>

    <!-- Grid -->
    <div v-else-if="filtered.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink
        v-for="db in filtered"
        :key="db.name"
        :to="`/databases/${db.name}`"
        class="group bg-card border rounded-xl p-5 hover:border-blue-500/50 hover:shadow-md transition-all space-y-4"
      >
        <div class="flex items-start justify-between">
          <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
            <DatabaseIcon class="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" />
          </div>
          <span
            :class="db.empty ? 'bg-muted text-muted-foreground' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'"
            class="text-xs px-2 py-0.5 rounded-full font-medium"
          >
            {{ db.empty ? 'Vide' : 'Active' }}
          </span>
        </div>
        <div>
          <h3 class="font-semibold text-base group-hover:text-blue-600 transition-colors truncate">{{ db.name }}</h3>
          <div class="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
            <HardDriveIcon class="w-3.5 h-3.5" />
            {{ formatBytes(db.sizeOnDisk) }}
          </div>
        </div>
      </NuxtLink>
    </div>

    <div v-else class="text-center py-16 text-muted-foreground">
      <DatabaseIcon class="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p class="text-lg font-medium">Aucune base de données trouvée</p>
      <p class="text-sm mt-1">{{ search ? 'Modifiez votre recherche' : 'Créez votre première base de données' }}</p>
    </div>
  </div>
</template>
