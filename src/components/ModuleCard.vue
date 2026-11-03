<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ModuleEntry } from '../modules/catalog'

/** Card de un modulo: toda ella es un enlace a su ruta. */
const props = defineProps<{ module: ModuleEntry }>()

const loaded = ref(false)
const failed = ref(false)
const initial = computed(() => props.module.title.charAt(0).toUpperCase())
</script>

<template>
  <RouterLink :to="module.path" class="module-card" data-testid="module-card">
    <span class="module-card__img">
      <span v-if="!loaded && !failed" class="skeleton skeleton--fill" aria-hidden="true"></span>
      <span v-if="failed" class="module-card__fallback" aria-hidden="true">{{ initial }}</span>
      <img
        v-else
        :src="module.icon"
        alt=""
        width="56"
        height="56"
        loading="lazy"
        :class="{ 'is-hidden': !loaded }"
        @load="loaded = true"
        @error="failed = true"
      />
    </span>
    <span class="module-card__title">{{ module.title }}</span>
    <span class="module-card__desc">{{ module.description }}</span>
  </RouterLink>
</template>
