<script setup lang="ts">
import {
  DatabaseIcon, LayoutDashboardIcon, LogOutIcon, MenuIcon, ChevronRightIcon
} from '@lucide/vue'

const { user, logout } = useAuth()
const route = useRoute()
const sidebarOpen = ref(true)

const navItems = [
  { label: 'Dashboard', icon: 'dashboard', to: '/' },
  { label: 'Bases de données', icon: 'database', to: '/databases' },
]
</script>

<template>
  <div class="flex h-screen bg-background overflow-hidden">
    <!-- Sidebar -->
    <aside
      :class="[
        'flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 shrink-0',
        sidebarOpen ? 'w-64' : 'w-16'
      ]"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div class="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
          </svg>
        </div>
        <Transition name="fade">
          <span v-if="sidebarOpen" class="font-bold text-lg tracking-tight text-white">MongoPilot</span>
        </Transition>
      </div>

      <!-- Nav -->
      <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
          :class="route.path === item.to
            ? 'bg-blue-600 text-white'
            : 'text-white/70 hover:bg-white/10 hover:text-white'"
        >
          <DatabaseIcon v-if="item.icon === 'database'" class="w-5 h-5 shrink-0" />
          <LayoutDashboardIcon v-else class="w-5 h-5 shrink-0" />
          <Transition name="fade">
            <span v-if="sidebarOpen">{{ item.label }}</span>
          </Transition>
        </NuxtLink>
      </nav>

      <!-- User + Logout -->
      <div class="p-3 border-t border-white/10">
        <div v-if="sidebarOpen" class="flex items-center gap-2 px-3 py-2 mb-1">
          <div class="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {{ user?.username?.[0]?.toUpperCase() }}
          </div>
          <span class="text-sm text-white/80 truncate">{{ user?.username }}</span>
        </div>
        <button
          @click="logout"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-red-600/20 hover:text-red-400 transition-all"
        >
          <LogOutIcon class="w-5 h-5 shrink-0" />
          <Transition name="fade">
            <span v-if="sidebarOpen">Déconnexion</span>
          </Transition>
        </button>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Header -->
      <header class="h-14 border-b bg-card flex items-center gap-3 px-4 shrink-0 shadow-sm">
        <button
          @click="sidebarOpen = !sidebarOpen"
          class="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <MenuIcon class="w-5 h-5" />
        </button>

        <!-- Breadcrumb -->
        <nav class="flex items-center gap-1.5 text-sm flex-1 min-w-0">
          <NuxtLink to="/" class="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            MongoPilot
          </NuxtLink>
          <template v-for="(segment, i) in route.path.split('/').filter(Boolean)" :key="i">
            <ChevronRightIcon class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span class="text-foreground font-medium truncate capitalize">
              {{ decodeURIComponent(segment) }}
            </span>
          </template>
        </nav>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-auto p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
