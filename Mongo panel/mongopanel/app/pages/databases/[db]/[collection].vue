<script setup lang="ts">
import {
  SearchIcon, FilterIcon, ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon,
  PlusIcon, Trash2Icon, PencilIcon, RefreshCwIcon, EyeIcon, XIcon
} from '@lucide/vue'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const dbName = computed(() => route.params.db as string)
const collectionName = computed(() => route.params.collection as string)
const { apiFetch } = useAuth()

const page = ref(1)
const limit = ref(20)
const filterStr = ref('')
const filterInput = ref('')
const filterError = ref('')
const sortField = ref('_id')
const sortOrder = ref<'asc' | 'desc'>('desc')

const { data, pending, refresh } = await useAsyncData(
  `docs-${dbName.value}-${collectionName.value}`,
  () => apiFetch<{
    documents: Array<Record<string, unknown>>
    total: number
    page: number
    limit: number
    pages: number
  }>(`/api/${dbName.value}/${collectionName.value}/documents`, {
    query: {
      page: page.value,
      limit: limit.value,
      filter: filterStr.value || undefined,
      sortField: sortField.value,
      sortOrder: sortOrder.value,
    }
  }),
  { watch: [page, limit, filterStr, sortField, sortOrder] }
)

const applyFilter = () => {
  filterError.value = ''
  if (!filterInput.value.trim()) {
    filterStr.value = ''
    return
  }
  try {
    JSON.parse(filterInput.value)
    filterStr.value = filterInput.value
    page.value = 1
  } catch {
    filterError.value = 'JSON invalide'
  }
}

const clearFilter = () => {
  filterInput.value = ''
  filterStr.value = ''
  page.value = 1
}

// Selected document for detail view
const selectedDoc = ref<Record<string, unknown> | null>(null)
const showDetail = ref(false)
const deleteConfirm = ref<string | null>(null)

const openDetail = (doc: Record<string, unknown>) => {
  selectedDoc.value = doc
  showDetail.value = true
}

const deleteDocument = async (id: string) => {
  await apiFetch(`/api/${dbName.value}/${collectionName.value}/${id}`, { method: 'DELETE' })
  deleteConfirm.value = null
  await refresh()
}

const getDocId = (doc: Record<string, unknown>) => doc._id as string

const getDocPreview = (doc: Record<string, unknown>) => {
  const keys = Object.keys(doc).filter(k => k !== '_id').slice(0, 3)
  return keys.map(k => {
    const val = doc[k]
    const display = typeof val === 'string' ? `"${val.slice(0, 30)}"` : JSON.stringify(val)?.slice(0, 30)
    return `${k}: ${display}`
  }).join(' · ')
}
</script>

<template>
  <div class="space-y-4 h-full flex flex-col">
    <!-- Header -->
    <div class="flex items-center gap-3 shrink-0">
      <NuxtLink :to="`/databases/${dbName}`" class="p-2 rounded-lg hover:bg-muted transition-colors">
        <ArrowLeftIcon class="w-5 h-5" />
      </NuxtLink>
      <div class="flex-1 min-w-0">
        <h1 class="text-2xl font-bold truncate">{{ collectionName }}</h1>
        <p class="text-muted-foreground text-sm">
          <span class="text-blue-600">{{ dbName }}</span>
          <span class="mx-1">·</span>
          {{ data?.total ?? 0 }} document(s)
        </p>
      </div>
      <button @click="refresh" class="p-2 rounded-lg hover:bg-muted transition-colors" title="Rafraîchir">
        <RefreshCwIcon :class="['w-4 h-4', pending ? 'animate-spin' : '']" />
      </button>
    </div>

    <!-- Filter bar -->
    <div class="bg-card border rounded-xl p-4 space-y-3 shrink-0">
      <div class="flex items-center gap-2">
        <FilterIcon class="w-4 h-4 text-muted-foreground shrink-0" />
        <span class="text-sm font-medium">Filtre MongoDB (JSON)</span>
      </div>
      <div class="flex gap-2">
        <input
          v-model="filterInput"
          type="text"
          placeholder='{ "field": "value" }'
          class="flex-1 px-3 py-2 bg-muted border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          @keyup.enter="applyFilter"
        />
        <button
          @click="applyFilter"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 transition-colors"
        >
          Filtrer
        </button>
        <button
          v-if="filterStr"
          @click="clearFilter"
          class="px-3 py-2 border rounded-lg text-sm hover:bg-muted transition-colors"
        >
          <XIcon class="w-4 h-4" />
        </button>
      </div>
      <p v-if="filterError" class="text-red-500 text-xs">{{ filterError }}</p>
      <div v-if="filterStr" class="text-xs text-muted-foreground">
        Filtre actif : <code class="font-mono bg-muted px-1 rounded">{{ filterStr }}</code>
      </div>
    </div>

    <!-- Documents list -->
    <div class="flex-1 overflow-hidden flex flex-col min-h-0">
      <div v-if="pending" class="space-y-2">
        <div v-for="i in 8" :key="i" class="h-14 bg-card border rounded-xl animate-pulse" />
      </div>

      <div v-else-if="data?.documents?.length" class="bg-card border rounded-xl overflow-hidden flex flex-col">
        <div class="overflow-auto flex-1">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-muted/80 backdrop-blur border-b">
              <tr>
                <th class="text-left px-4 py-3 font-semibold text-muted-foreground w-52">_id</th>
                <th class="text-left px-4 py-3 font-semibold text-muted-foreground">Aperçu</th>
                <th class="px-4 py-3 w-24 shrink-0"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="doc in data.documents"
                :key="getDocId(doc)"
                class="border-b last:border-0 hover:bg-muted/30 transition-colors group"
              >
                <td class="px-4 py-3 font-mono text-xs text-muted-foreground truncate max-w-0 w-52">
                  {{ getDocId(doc) }}
                </td>
                <td class="px-4 py-3 text-xs text-muted-foreground truncate max-w-0">
                  {{ getDocPreview(doc) }}
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      @click="openDetail(doc)"
                      class="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 transition-colors"
                      title="Voir"
                    >
                      <EyeIcon class="w-4 h-4" />
                    </button>
                    <NuxtLink
                      :to="`/databases/${dbName}/${collectionName}/${getDocId(doc)}`"
                      class="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 transition-colors"
                      title="Modifier"
                    >
                      <PencilIcon class="w-4 h-4" />
                    </NuxtLink>
                    <button
                      @click="deleteConfirm = getDocId(doc)"
                      class="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2Icon class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="flex items-center justify-between px-4 py-3 border-t bg-muted/30 shrink-0">
          <span class="text-xs text-muted-foreground">
            {{ (page - 1) * limit + 1 }}–{{ Math.min(page * limit, data.total) }} sur {{ data.total }}
          </span>
          <div class="flex items-center gap-1">
            <button
              @click="page--"
              :disabled="page <= 1"
              class="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeftIcon class="w-4 h-4" />
            </button>
            <span class="text-xs px-2 font-medium">{{ page }} / {{ data.pages }}</span>
            <button
              @click="page++"
              :disabled="page >= data.pages"
              class="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRightIcon class="w-4 h-4" />
            </button>
          </div>
          <select
            v-model="limit"
            class="text-xs bg-transparent border rounded px-2 py-1 focus:outline-none"
          >
            <option :value="10">10 / page</option>
            <option :value="20">20 / page</option>
            <option :value="50">50 / page</option>
            <option :value="100">100 / page</option>
          </select>
        </div>
      </div>

      <div v-else class="text-center py-16 text-muted-foreground bg-card border rounded-xl">
        <SearchIcon class="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p class="text-lg font-medium">Aucun document</p>
        <p class="text-sm mt-1">{{ filterStr ? 'Aucun résultat pour ce filtre' : 'La collection est vide' }}</p>
      </div>
    </div>
  </div>

  <!-- Document detail modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showDetail && selectedDoc" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showDetail = false" />
        <div class="relative bg-card border rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
          <div class="flex items-center justify-between px-6 py-4 border-b shrink-0">
            <h3 class="font-semibold">Document</h3>
            <button @click="showDetail = false" class="p-1 rounded hover:bg-muted transition-colors">
              <XIcon class="w-5 h-5" />
            </button>
          </div>
          <div class="overflow-auto p-6 flex-1">
            <AppJsonViewer :data="selectedDoc" />
          </div>
          <div class="flex gap-2 px-6 py-4 border-t shrink-0">
            <NuxtLink
              :to="`/databases/${dbName}/${collectionName}/${getDocId(selectedDoc)}`"
              class="flex-1 text-center py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
              @click="showDetail = false"
            >
              Modifier
            </NuxtLink>
            <button
              @click="showDetail = false"
              class="py-2 px-4 border rounded-lg text-sm hover:bg-muted transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Delete confirm modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="deleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="deleteConfirm = null" />
        <div class="relative bg-card border rounded-2xl w-full max-w-sm p-6 shadow-2xl">
          <h3 class="font-semibold text-lg mb-2">Confirmer la suppression</h3>
          <p class="text-sm text-muted-foreground mb-1">Ce document sera supprimé définitivement.</p>
          <code class="text-xs text-muted-foreground font-mono block truncate mb-5">{{ deleteConfirm }}</code>
          <div class="flex gap-2">
            <button
              @click="deleteDocument(deleteConfirm!)"
              class="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Supprimer
            </button>
            <button
              @click="deleteConfirm = null"
              class="flex-1 py-2 border rounded-lg text-sm hover:bg-muted transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .relative, .modal-leave-to .relative { transform: scale(0.95); }
</style>
