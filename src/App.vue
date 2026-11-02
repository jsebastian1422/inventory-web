<script setup lang="ts">
import { computed, watch } from 'vue'
import { START_LOCATION, useRoute, useRouter } from 'vue-router'
import AuthLayout from './layouts/AuthLayout.vue'
import DashboardLayout from './layouts/DashboardLayout.vue'
import { resolveAccess } from './router/guards'
import { useSessionStore } from './stores/session'

const session = useSessionStore()
const route = useRoute()
const router = useRouter()
const layout = computed(() => route.meta.layout)

// La sesion cambia fuera de una navegacion (vence, se cierra en otra pestana, se inicia en otra):
// se aplican las mismas reglas de acceso a la ruta actual.
watch(
  () => session.status,
  () => {
    if (session.status === 'unknown') return
    // Arranque en frio: la navegacion inicial aun esta en curso y su guarda (que espera la
    // restauracion de la sesion) decide con la ruta real; actuar aqui pisaria el destino.
    if (router.currentRoute.value === START_LOCATION) return
    const target = resolveAccess(router.currentRoute.value, session, session.notice === 'expired')
    if (target !== true) void router.replace(target)
  },
)
</script>

<template>
  <div v-if="session.status === 'unknown'" class="boot" role="status" aria-live="polite">
    <span class="spinner spinner--lg" aria-hidden="true"></span>
    <span>Cargando…</span>
  </div>
  <AuthLayout v-else-if="layout === 'auth'" />
  <DashboardLayout v-else>
    <RouterView />
  </DashboardLayout>
</template>
