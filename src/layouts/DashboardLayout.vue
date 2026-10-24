<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '../stores/app'

const app = useAppStore()
const route = useRoute()
const title = computed(() => (route.meta.title as string | undefined) ?? 'Inventario')
// Los modulos futuros se agregan aqui (y en el router).
const navItems = [{ label: 'Inicio', to: '/' }]
</script>

<template>
  <div class="layout">
    <aside v-show="app.sidebarOpen" class="sidebar" data-testid="sidebar">
      <div class="brand">Inventario</div>
      <nav>
        <RouterLink v-for="item in navItems" :key="item.to" :to="item.to" class="nav-link">
          {{ item.label }}
        </RouterLink>
      </nav>
    </aside>
    <div class="main">
      <header class="header" data-testid="header">
        <button
          type="button"
          class="toggle"
          aria-label="Alternar menu"
          @click="app.toggleSidebar()"
        >
          &#9776;
        </button>
        <h1>{{ title }}</h1>
      </header>
      <main class="content" data-testid="content">
        <slot />
      </main>
    </div>
  </div>
</template>
