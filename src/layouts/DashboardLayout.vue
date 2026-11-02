<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useSessionStore } from '../stores/session'

const app = useAppStore()
const session = useSessionStore()
const route = useRoute()
const title = computed(() => (route.meta.title as string | undefined) ?? 'Inventario')
// Los modulos futuros se agregan aqui (y en el router).
const navItems = [{ label: 'Inicio', to: '/' }]

/** Cierra la sesion; la navegacion al login la hace el observador de sesion de App.vue. */
async function signOut(): Promise<void> {
  await session.logout()
}
</script>

<template>
  <div class="layout">
    <aside v-show="app.sidebarOpen" class="sidebar" data-testid="sidebar">
      <div class="brand">Inventario</div>
      <nav aria-label="Principal">
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
        <div class="header__user">
          <span v-if="session.user" class="header__name" data-testid="user-name">
            {{ session.user.fullName }}
          </span>
          <button type="button" class="btn btn--ghost" data-testid="logout" @click="signOut">
            Cerrar sesión
          </button>
        </div>
      </header>
      <main class="content" data-testid="content">
        <slot />
      </main>
    </div>
  </div>
</template>
