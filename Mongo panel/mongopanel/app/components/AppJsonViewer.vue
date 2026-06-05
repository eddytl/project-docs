<script setup lang="ts">
const props = defineProps<{ data: unknown; depth?: number }>()
const depth = computed(() => props.depth ?? 0)

type JsonValue = string | number | boolean | null | JsonObject | JsonArray
type JsonObject = Record<string, JsonValue>
type JsonArray = JsonValue[]

const isObject = (v: unknown): v is JsonObject =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isArray = (v: unknown): v is JsonArray => Array.isArray(v)

const collapsed = ref<Set<string>>(new Set())
const toggle = (key: string) => {
  if (collapsed.value.has(key)) collapsed.value.delete(key)
  else collapsed.value.add(key)
}
</script>

<template>
  <div :class="depth > 0 ? 'pl-4 border-l border-border/50' : ''" class="font-mono text-xs leading-6">
    <template v-if="isObject(data)">
      <div v-for="(val, key) in (data as JsonObject)" :key="String(key)" class="group">
        <div class="flex items-start gap-1 hover:bg-muted/40 rounded px-1 -mx-1">
          <button
            v-if="isObject(val) || isArray(val)"
            @click="toggle(String(key))"
            class="text-muted-foreground hover:text-foreground mt-0.5 shrink-0 w-4"
          >
            {{ collapsed.has(String(key)) ? '▶' : '▼' }}
          </button>
          <span v-else class="w-4 shrink-0" />
          <span class="json-key shrink-0">"{{ key }}"</span>
          <span class="text-muted-foreground mx-0.5">:</span>
          <template v-if="!collapsed.has(String(key)) && (isObject(val) || isArray(val))">
            <AppJsonViewer :data="val" :depth="depth + 1" />
          </template>
          <template v-else-if="collapsed.has(String(key))">
            <span class="text-muted-foreground cursor-pointer hover:text-foreground" @click="toggle(String(key))">
              {{ isArray(val) ? `[… ${(val as JsonArray).length} items]` : '{…}' }}
            </span>
          </template>
          <template v-else-if="typeof val === 'string'">
            <span class="json-string truncate">"{{ val }}"</span>
          </template>
          <template v-else-if="typeof val === 'number'">
            <span class="json-number">{{ val }}</span>
          </template>
          <template v-else-if="typeof val === 'boolean'">
            <span class="json-boolean">{{ val }}</span>
          </template>
          <template v-else>
            <span class="json-null">null</span>
          </template>
        </div>
      </div>
    </template>
    <template v-else-if="isArray(data)">
      <div v-for="(item, idx) in (data as JsonArray)" :key="idx" class="flex items-start gap-1">
        <span class="text-muted-foreground shrink-0 w-6 text-right">{{ idx }}</span>
        <span class="text-muted-foreground mx-0.5">:</span>
        <template v-if="isObject(item) || isArray(item)">
          <AppJsonViewer :data="item" :depth="depth + 1" />
        </template>
        <template v-else-if="typeof item === 'string'">
          <span class="json-string">"{{ item }}"</span>
        </template>
        <template v-else-if="typeof item === 'number'">
          <span class="json-number">{{ item }}</span>
        </template>
        <template v-else-if="typeof item === 'boolean'">
          <span class="json-boolean">{{ item }}</span>
        </template>
        <template v-else>
          <span class="json-null">null</span>
        </template>
      </div>
    </template>
  </div>
</template>
