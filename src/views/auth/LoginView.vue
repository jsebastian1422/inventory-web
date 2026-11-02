<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PasswordField from '../../components/PasswordField.vue'
import { safeRedirect } from '../../router/guards'
import { useSessionStore } from '../../stores/session'
import { isValidEmail, loginMessage } from './messages'

const session = useSessionStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const loading = ref(false)
const formError = ref('')
const emailError = ref('')
const passwordError = ref('')
const expiredNotice = computed(() => session.notice === 'expired')

function validate(): boolean {
  emailError.value = isValidEmail(email.value) ? '' : 'Ingresa un correo electrónico válido.'
  passwordError.value = password.value ? '' : 'Ingresa tu contraseña.'
  return !emailError.value && !passwordError.value
}

async function submit(): Promise<void> {
  formError.value = ''
  if (loading.value || !validate()) return
  loading.value = true
  try {
    await session.login(email.value.trim(), password.value)
    await router.replace(safeRedirect(route.query.redirect))
  } catch (error) {
    // Lo escrito se conserva: solo se informa del problema.
    formError.value = loginMessage(error)
  } finally {
    loading.value = false
  }
}

onBeforeUnmount(() => session.dismissNotice())
</script>

<template>
  <section aria-labelledby="login-title">
    <h1 id="login-title" class="auth-title">Iniciar sesión</h1>
    <p class="auth-lead">Ingresa con tu cuenta para continuar.</p>

    <form novalidate class="auth-form" @submit.prevent="submit">
      <div aria-live="polite" class="auth-messages">
        <p v-if="expiredNotice" class="alert alert--info" data-testid="expired-notice">
          Tu sesión expiró. Ingresa de nuevo para continuar.
        </p>
        <p v-if="formError" class="alert alert--error" data-testid="form-error">{{ formError }}</p>
      </div>

      <div class="field" :class="{ 'field--invalid': !!emailError }">
        <label for="login-email">Correo electrónico</label>
        <div class="field__control">
          <input
            id="login-email"
            v-model="email"
            type="email"
            inputmode="email"
            autocomplete="username"
            maxlength="254"
            :aria-invalid="emailError ? 'true' : 'false'"
            :aria-describedby="emailError ? 'login-email-error' : undefined"
          />
        </div>
        <p v-if="emailError" id="login-email-error" class="field__error" role="alert">
          {{ emailError }}
        </p>
      </div>

      <PasswordField
        id="login-password"
        v-model="password"
        label="Contraseña"
        autocomplete="current-password"
        :error="passwordError"
      />

      <button type="submit" class="btn btn--primary" :disabled="loading" :aria-busy="loading">
        <span v-if="loading" class="spinner" aria-hidden="true"></span>
        {{ loading ? 'Ingresando…' : 'Ingresar' }}
      </button>
    </form>

    <p class="auth-links">
      <RouterLink :to="{ name: 'forgot-password' }">¿Olvidaste tu contraseña?</RouterLink>
    </p>
  </section>
</template>
