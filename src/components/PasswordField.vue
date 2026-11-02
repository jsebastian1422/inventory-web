<script setup lang="ts">
import { ref } from 'vue'

/** Campo de contraseña con etiqueta asociada y boton para mostrar u ocultar el valor. */
const props = defineProps<{
  id: string
  label: string
  autocomplete: 'current-password' | 'new-password'
  error?: string
  /** Id de un texto de ayuda que describe el campo. */
  describedBy?: string
}>()
const model = defineModel<string>({ required: true })
const visible = ref(false)
const errorId = `${props.id}-error`
</script>

<template>
  <div class="field" :class="{ 'field--invalid': !!error }">
    <label :for="id">{{ label }}</label>
    <div class="field__control">
      <input
        :id="id"
        v-model="model"
        :type="visible ? 'text' : 'password'"
        :autocomplete="autocomplete"
        :aria-invalid="error ? 'true' : 'false'"
        :aria-describedby="
          [describedBy, error ? errorId : ''].filter(Boolean).join(' ') || undefined
        "
        maxlength="256"
      />
      <button
        type="button"
        class="field__toggle"
        :aria-pressed="visible"
        :aria-label="visible ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        @click="visible = !visible"
      >
        {{ visible ? 'Ocultar' : 'Mostrar' }}
      </button>
    </div>
    <p v-if="error" :id="errorId" class="field__error" role="alert">{{ error }}</p>
  </div>
</template>
