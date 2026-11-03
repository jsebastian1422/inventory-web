<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useModules } from '../modules/useModules'
import { useAppStore } from '../stores/app'
import { useSessionStore } from '../stores/session'

const app = useAppStore()
const session = useSessionStore()
const route = useRoute()
const title = computed(() => (route.meta.title as string | undefined) ?? 'Inventario')
const { visibleModules } = useModules()
const navItems = computed(() => [
  { id: 'home', label: 'Inicio', to: '/', icon: null as string | null },
  ...visibleModules.value.map((m) => ({ id: m.id, label: m.title, to: m.path, icon: m.icon })),
])

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
        <RouterLink v-for="item in navItems" :key="item.id" :to="item.to" class="nav-link">
          <img
            v-if="item.icon"
            :src="item.icon"
            alt=""
            width="20"
            height="20"
            class="nav-link__icon"
          />
          <span v-else class="nav-link__icon nav-link__icon--home" aria-hidden="true">&#8962;</span>
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
