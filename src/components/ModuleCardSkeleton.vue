<script setup lang="ts">
/** Esqueleto con la forma de ModuleCard: imagen, titulo y dos lineas de descripcion. */
</script>

<template>
  <div class="module-card module-card--skeleton" data-testid="module-skeleton" aria-hidden="true">
    <span class="skeleton module-card__img"></span>
    <span class="skeleton skeleton--title"></span>
    <span class="skeleton skeleton--line"></span>
    <span class="skeleton skeleton--line skeleton--short"></span>
  </div>
</template>
