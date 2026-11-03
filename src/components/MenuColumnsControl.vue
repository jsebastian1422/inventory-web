<script setup lang="ts">
/* global HTMLElement, KeyboardEvent */
import { nextTick, ref } from 'vue'
import { MAX_COLUMNS, MIN_COLUMNS } from '../preferences/menu-columns'

/**
 * Selector de cards por fila (2 a 5). Solo se muestra cuando el contenedor es ancho (ver style.css).
 * Patron radiogroup: tabindex itinerante (una parada de Tab) y navegacion con flechas, Home y End.
 */
const props = defineProps<{ modelValue: number }>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const options = Array.from({ length: MAX_COLUMNS - MIN_COLUMNS + 1 }, (_, i) => MIN_COLUMNS + i)
const group = ref<HTMLElement | null>(null)

/** Selecciona `value` y mueve el foco a su boton. */
async function select(value: number): Promise<void> {
  emit('update:modelValue', value)
  await nextTick()
  group.value?.querySelector<HTMLElement>(`[data-value="${value}"]`)?.focus()
}

/** Flechas, Home y End cambian la seleccion; el resto de teclas sigue su curso. */
function onKeydown(event: KeyboardEvent): void {
  let target: number
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      target = props.modelValue >= MAX_COLUMNS ? MIN_COLUMNS : props.modelValue + 1
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      target = props.modelValue <= MIN_COLUMNS ? MAX_COLUMNS : props.modelValue - 1
      break
    case 'Home':
      target = MIN_COLUMNS
      break
    case 'End':
      target = MAX_COLUMNS
      break
    default:
      return
  }
  event.preventDefault()
  void select(target)
}
</script>

<template>
  <div class="columns-control" data-testid="columns-control">
    <span id="columns-control-label" class="columns-control__label">Cards por fila</span>
    <div
      ref="group"
      role="radiogroup"
      aria-labelledby="columns-control-label"
      class="columns-control__group"
      @keydown="onKeydown"
    >
      <button
        v-for="n in options"
        :key="n"
        type="button"
        role="radio"
        class="columns-control__btn"
        :aria-checked="n === modelValue"
        :tabindex="n === modelValue ? 0 : -1"
        :data-value="n"
        @click="select(n)"
      >
        {{ n }}
      </button>
    </div>
  </div>
</template>
