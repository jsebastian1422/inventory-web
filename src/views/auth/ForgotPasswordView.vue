<script setup lang="ts">
import { ref } from 'vue'
import { authApi } from '../../api/auth'
import { ApiError } from '../../api/http'
import { isValidEmail, transportMessage } from './messages'

const email = ref('')
const loading = ref(false)
const sent = ref(false)
const formError = ref('')
const emailError = ref('')

async function submit(): Promise<void> {
  formError.value = ''
  emailError.value = isValidEmail(email.value) ? '' : 'Ingresa un correo electrónico válido.'
  if (loading.value || emailError.value) return
  loading.value = true
  try {
    await authApi.requestPasswordReset(email.value.trim())
    // La respuesta es la misma exista o no la cuenta: la pantalla tampoco lo revela.
    sent.value = true
  } catch (error) {
    formError.value =
      transportMessage(error) ??
      (error instanceof ApiError && error.status === 400
        ? 'Ingresa un correo electrónico válido.'
        : 'Ocurrió un error inesperado. Inténtalo de nuevo más tarde.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section aria-labelledby="forgot-title">
    <h1 id="forgot-title" class="auth-title">Recupera tu contraseña</h1>

    <div v-if="sent" aria-live="polite" data-testid="sent-confirmation">
      <p class="alert alert--success">
        Si el correo corresponde a una cuenta activa, te enviamos un enlace para restablecer la
        contraseña. Revisa tu bandeja de entrada; el enlace vence en 30 minutos.
      </p>
    </div>
    <template v-else>
      <p class="auth-lead">
        Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva.
      </p>
      <form novalidate class="auth-form" @submit.prevent="submit">
        <div aria-live="polite" class="auth-messages">
          <p v-if="formError" class="alert alert--error" data-testid="form-error">
            {{ formError }}
          </p>
        </div>
        <div class="field" :class="{ 'field--invalid': !!emailError }">
          <label for="forgot-email">Correo electrónico</label>
          <div class="field__control">
            <input
              id="forgot-email"
              v-model="email"
              type="email"
              inputmode="email"
              autocomplete="email"
              maxlength="254"
              :aria-invalid="emailError ? 'true' : 'false'"
              :aria-describedby="emailError ? 'forgot-email-error' : undefined"
            />
          </div>
          <p v-if="emailError" id="forgot-email-error" class="field__error" role="alert">
            {{ emailError }}
          </p>
        </div>
        <button type="submit" class="btn btn--primary" :disabled="loading" :aria-busy="loading">
          <span v-if="loading" class="spinner" aria-hidden="true"></span>
          {{ loading ? 'Enviando…' : 'Enviar enlace' }}
        </button>
      </form>
    </template>

    <p class="auth-links">
      <RouterLink :to="{ name: 'login' }">Volver a iniciar sesión</RouterLink>
    </p>
  </section>
</template>
