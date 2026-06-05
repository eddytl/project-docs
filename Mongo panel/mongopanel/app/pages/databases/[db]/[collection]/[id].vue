<script setup lang="ts">
import { ArrowLeftIcon, SaveIcon, Trash2Icon, AlertCircleIcon, CheckCircleIcon } from '@lucide/vue'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const dbName = computed(() => route.params.db as string)
const collectionName = computed(() => route.params.collection as string)
const docId = computed(() => route.params.id as string)
const { apiFetch } = useAuth()

const { data: doc, pending } = await useAsyncData(`doc-${docId.value}`, () =>
  apiFetch<Record<string, unknown>>(
    `/api/${dbName.value}/${collectionName.value}/${docId.value}`
  )
)

const editorContent = ref('')
const parseError = ref('')
const saving = ref(false)
const saved = ref(false)
const deleteConfirm = ref(false)

watchEffect(() => {
  if (doc.value) {
    editorContent.value = JSON.stringify(doc.value, null, 2)
  }
})

const validate = () => {
  parseError.value = ''
  try {
    JSON.parse(editorContent.value)
    return true
  } catch (e) {
    parseError.value = (e as Error).message
    return false
  }
}

const save = async () => {
  if (!validate()) return
  saving.value = true
  try {
    await apiFetch(`/api/${dbName.value}/${collectionName.value}/${docId.value}`, {
      method: 'PUT',
      body: JSON.parse(editorContent.value),
    })
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
  } finally {
    saving.value = false
  }
}

const deleteDoc = async () => {
  await apiFetch(`/api/${dbName.value}/${collectionName.value}/${docId.value}`, {
    method: 'DELETE',
  })
  router.push(`/databases/${dbName.value}/${collectionName.value}`)
}

const lineCount = computed(() => editorContent.value.split('\n').length)
</script>

<template>
  <div class="h-full flex flex-col space-y-4">
    <!-- Header -->
    <div class="flex items-center gap-3 shrink-0">
      <NuxtLink
        :to="`/databases/${dbName}/${collectionName}`"
        class="p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <ArrowLeftIcon class="w-5 h-5" />
      </NuxtLink>
      <div class="flex-1 min-w-0">
        <h1 class="text-xl font-bold">Modifier le document</h1>
        <p class="text-muted-foreground text-xs font-mono truncate">{{ docId }}</p>
      </div>
      <div class="flex items-center gap-2">
        <Transition name="fade">
          <div v-if="saved" class="flex items-center gap-1.5 text-green-600 text-sm">
            <CheckCircleIcon class="w-4 h-4" />
            <span>Sauvegardé</span>
          </div>
        </Transition>
        <button
          @click="deleteConfirm = true"
          class="flex items-center gap-1.5 px-3 py-2 border border-red-200 dark:border-red-900 text-red-600 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2Icon class="w-4 h-4" />
          Supprimer
        </button>
        <button
          @click="save"
          :disabled="saving || !!parseError"
          class="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          <SaveIcon :class="['w-4 h-4', saving ? 'animate-spin' : '']" />
          {{ saving ? 'Sauvegarde...' : 'Sauvegarder' }}
        </button>
      </div>
    </div>

    <!-- Editor -->
    <div v-if="pending" class="flex-1 bg-card border rounded-xl animate-pulse" />
    <div v-else class="flex-1 flex flex-col min-h-0 bg-card border rounded-xl overflow-hidden">
      <!-- Toolbar -->
      <div class="flex items-center justify-between px-4 py-2 border-b bg-muted/30 text-xs text-muted-foreground shrink-0">
        <span>JSON Editor · {{ lineCount }} lignes</span>
        <Transition name="fade">
          <div v-if="parseError" class="flex items-center gap-1.5 text-red-500">
            <AlertCircleIcon class="w-3.5 h-3.5" />
            {{ parseError }}
          </div>
        </Transition>
      </div>

      <!-- Textarea with line numbers -->
      <div class="flex flex-1 overflow-auto font-mono text-sm">
        <!-- Line numbers -->
        <div class="shrink-0 select-none bg-muted/30 border-r px-3 py-4 text-right text-muted-foreground text-xs leading-6 min-w-[3rem]">
          <div v-for="n in lineCount" :key="n">{{ n }}</div>
        </div>
        <!-- Editor -->
        <textarea
          v-model="editorContent"
          class="flex-1 resize-none bg-transparent p-4 text-xs leading-6 focus:outline-none font-mono"
          spellcheck="false"
          @input="validate"
        />
      </div>
    </div>
  </div>

  <!-- Delete confirm -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="deleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="deleteConfirm = false" />
        <div class="relative bg-card border rounded-2xl w-full max-w-sm p-6 shadow-2xl">
          <h3 class="font-semibold text-lg mb-2">Confirmer la suppression</h3>
          <p class="text-sm text-muted-foreground mb-5">Ce document sera supprimé définitivement et cette action est irréversible.</p>
          <div class="flex gap-2">
            <button @click="deleteDoc" class="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors">
              Supprimer
            </button>
            <button @click="deleteConfirm = false" class="flex-1 py-2 border rounded-lg text-sm hover:bg-muted transition-colors">
              Annuler
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
