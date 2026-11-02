<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BrandLogo from '../components/BrandLogo.vue'

/**
 * Layout de las rutas publicas. El fondo vive aqui y no se vuelve a montar al pasar de una vista
 * a otra: solo cambia el panel (a la derecha en el login, centrado en recuperacion).
 */
const route = useRoute()
const panel = computed(() => (route.meta.panel === 'center' ? 'center' : 'side'))
</script>

<template>
  <div class="auth-layout" data-testid="auth-layout">
    <div class="auth-layout__bg" aria-hidden="true"></div>
    <main class="auth-layout__stage" :class="`auth-layout__stage--${panel}`">
      <div class="auth-panel" :class="`auth-panel--${panel}`" data-testid="auth-panel">
        <BrandLogo size="lg" class="auth-panel__brand" />
        <RouterView v-slot="{ Component, route: current }">
          <Transition name="auth-swap" mode="out-in">
            <component :is="Component" :key="current.path" />
          </Transition>
        </RouterView>
      </div>
    </main>
  </div>
</template>

<style scoped>
.auth-layout {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  /* Color de respaldo mientras carga la ilustracion. */
  background-color: var(--color-primary-dark);
  overflow-x: hidden;
}
.auth-layout__bg {
  position: absolute;
  inset: 0;
  background-color: var(--color-primary-dark);
  background-image: url('../assets/auth-bg.svg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
.auth-layout__stage {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.auth-panel {
  width: 100%;
  background: var(--color-surface-glass);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-panel);
  padding: 2rem 1.5rem;
}
.auth-panel--center {
  max-width: 26rem;
}
.auth-panel--side {
  max-width: 26rem;
}
.auth-panel__brand {
  margin-bottom: 1.5rem;
}

@media (min-width: 1024px) {
  .auth-layout__stage--side {
    justify-content: flex-end;
    padding: 0;
  }
  /* Panel pegado a la derecha, de alto completo. */
  .auth-panel--side {
    max-width: 27.5rem;
    min-height: 100vh;
    min-height: 100dvh;
    border-radius: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 3rem 3rem;
  }
  .auth-panel--center {
    padding: 2.5rem 2.5rem;
  }
}
@media (min-width: 1024px) and (prefers-reduced-motion: no-preference) {
  .auth-panel {
    transition:
      max-width 0.25s ease,
      border-radius 0.25s ease;
  }
}

.auth-swap-enter-active,
.auth-swap-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.auth-swap-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.auth-swap-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
@media (prefers-reduced-motion: reduce) {
  .auth-swap-enter-active,
  .auth-swap-leave-active {
    transition: none;
  }
  .auth-swap-enter-from,
  .auth-swap-leave-to {
    transform: none;
  }
}
</style>
