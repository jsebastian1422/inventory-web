<script setup lang="ts">
/** Marca "Inventario": isotipo SVG propio (caja apilada) y nombre. */
defineProps<{ size?: 'sm' | 'lg' }>()
</script>

<template>
  <span class="brand-logo" :class="size === 'lg' ? 'brand-logo--lg' : ''">
    <svg class="brand-logo__mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path
        d="M7 12.5 16 8l9 4.5v9L16 26l-9-4.5v-9Z"
        fill="none"
        stroke="#fff"
        stroke-width="1.8"
      />
      <path d="M7 12.5 16 17l9-4.5M16 17v9" fill="none" stroke="#f2a93b" stroke-width="1.8" />
    </svg>
    <span class="brand-logo__name">Inventario</span>
  </span>
</template>

<style scoped>
.brand-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--color-primary);
  font-weight: 700;
  font-size: 1.15rem;
  letter-spacing: 0.01em;
}
.brand-logo__mark {
  width: 2rem;
  height: 2rem;
  flex: none;
}
.brand-logo--lg {
  font-size: 1.5rem;
}
.brand-logo--lg .brand-logo__mark {
  width: 2.6rem;
  height: 2.6rem;
}
</style>
