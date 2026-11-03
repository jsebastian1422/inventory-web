<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

/** Pantalla provisional de un modulo cuya vista real aun no existe. */
const route = useRoute()
const title = computed(() => (route.meta.title as string | undefined) ?? 'Módulo')
</script>

<template>
  <section class="placeholder" data-testid="module-placeholder">
    <h2>En construcción</h2>
    <p>El módulo {{ title }} estará disponible pronto.</p>
    <RouterLink to="/" class="btn btn--ghost">Volver al inicio</RouterLink>
  </section>
</template>
