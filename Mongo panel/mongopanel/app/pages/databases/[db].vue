<script setup lang="ts">
import { TableIcon, HardDriveIcon, SearchIcon, ArrowLeftIcon, IndexIcon } from '@lucide/vue'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const dbName = computed(() => route.params.db as string)
const { apiFetch } = useAuth()
const search = ref('')

const { data, pending } = await useAsyncData(`collections-${dbName.value}`, () =>
  apiFetch<{
    collections: Array<{
      name: string
      type: string
      count: number
      size: number
      storageSize: number
      indexes: number
    }>
    database: string
  }>(`/api/${dbName.value}/collections`)
)

const filtered = computed(() =>
  (data.value?.collections ?? []).filter(col =>
    col.name.toLowerCase().includes(search.value.toLowerCase())
  )
)

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

const formatCount = (n: number) =>
  n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toString()
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <NuxtLink to="/databases" class="p-2 rounded-lg hover:bg-muted transition-colors">
        <ArrowLeftIcon class="w-5 h-5" />
      </NuxtLink>
      <div>
        <h1 class="text-2xl font-bold">{{ dbName }}</h1>
        <p class="text-muted-foreground text-sm">
          {{ data?.collections?.length ?? 0 }} collection(s)
        </p>
      </div>
    </div>

    <!-- Search -->
    <div class="relative max-w-sm">
      <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        v-model="search"
        type="text"
        placeholder="Rechercher une collection..."
        class="w-full pl-9 pr-4 py-2 bg-card border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
      />
    </div>

    <!-- Loading -->
    <div v-if="pending" class="space-y-2">
      <div v-for="i in 5" :key="i" class="h-16 bg-card border rounded-xl animate-pulse" />
    </div>

    <!-- Table -->
    <div v-else-if="filtered.length" class="bg-card border rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b bg-muted/50">
            <th class="text-left px-4 py-3 font-semibold text-muted-foreground">Collection</th>
            <th class="text-right px-4 py-3 font-semibold text-muted-foreground">Documents</th>
            <th class="text-right px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Taille</th>
            <th class="text-right px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">Index</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="col in filtered"
            :key="col.name"
            class="border-b last:border-0 hover:bg-muted/30 transition-colors"
          >
            <td class="px-4 py-3">
              <NuxtLink
                :to="`/databases/${dbName}/${col.name}`"
                class="flex items-center gap-2.5 group"
              >
                <div class="w-7 h-7 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0">
                  <TableIcon class="w-4 h-4 text-blue-600" />
                </div>
                <span class="font-medium group-hover:text-blue-600 transition-colors">{{ col.name }}</span>
              </NuxtLink>
            </td>
            <td class="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
              {{ formatCount(col.count) }}
            </td>
            <td class="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
              {{ formatBytes(col.size) }}
            </td>
            <td class="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">
              {{ col.indexes }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="text-center py-16 text-muted-foreground">
      <TableIcon class="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p class="text-lg font-medium">Aucune collection trouvée</p>
    </div>
  </div>
</template>
