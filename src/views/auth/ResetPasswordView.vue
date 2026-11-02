<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { authApi } from '../../api/auth'
import { ApiError } from '../../api/http'
import PasswordField from '../../components/PasswordField.vue'
import { transportMessage } from './messages'
import { clearUrlFragment, readResetToken } from './reset-link'

const MIN = 8
const MAX = 128

const route = useRoute()
/** Token del enlace; solo vive en memoria del componente. */
const token = ref('')
const password = ref('')
const confirmation = ref('')
const loading = ref(false)
const done = ref(false)
const linkInvalid = ref(false)
const formError = ref('')
const passwordError = ref('')
const confirmError = ref('')

/** Requisitos de la politica del servidor (8-128 caracteres, una letra y un numero). */
function policyProblem(value: string): string {
  if (value.length < MIN || value.length > MAX)
    return `Debe tener entre ${MIN} y ${MAX} caracteres.`
  if (!/\p{L}/u.test(value)) return 'Debe incluir al menos una letra.'
  if (!/\d/.test(value)) return 'Debe incluir al menos un número.'
  return ''
}

onMounted(() => {
  token.value = readResetToken(route.hash)
  if (route.hash) clearUrlFragment()
  linkInvalid.value = token.value === ''
})

function validate(): boolean {
  passwordError.value = policyProblem(password.value)
  confirmError.value =
    !passwordError.value && confirmation.value !== password.value
      ? 'Las contraseñas no coinciden.'
      : ''
  return !passwordError.value && !confirmError.value
}

async function submit(): Promise<void> {
  formError.value = ''
  if (loading.value || !validate()) return
  loading.value = true
  try {
    await authApi.confirmPasswordReset(token.value, password.value)
    token.value = ''
    done.value = true
  } catch (error) {
    if (error instanceof ApiError && error.status === 400 && error.code === 'INVALID_RESET_TOKEN') {
      linkInvalid.value = true
    } else if (error instanceof ApiError && error.status === 400) {
      passwordError.value =
        error.details?.find((d) => d.field === 'newPassword')?.message ??
        'La contraseña no cumple los requisitos.'
    } else {
      formError.value =
        transportMessage(error) ?? 'Ocurrió un error inesperado. Inténtalo de nuevo más tarde.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section aria-labelledby="reset-title">
    <h1 id="reset-title" class="auth-title">Elige una contraseña nueva</h1>

    <div v-if="done" aria-live="polite" data-testid="reset-done">
      <p class="alert alert--success">
        Tu contraseña se actualizó. Ya puedes iniciar sesión con la nueva.
      </p>
      <p class="auth-links">
        <RouterLink :to="{ name: 'login' }" class="btn btn--primary btn--link">
          Iniciar sesión
        </RouterLink>
      </p>
    </div>

    <div v-else-if="linkInvalid" aria-live="polite" data-testid="link-invalid">
      <p class="alert alert--error">
        El enlace no es válido o ya expiró. Solicita uno nuevo para continuar.
      </p>
      <p class="auth-links">
        <RouterLink :to="{ name: 'forgot-password' }">Solicitar un enlace nuevo</RouterLink>
      </p>
    </div>

    <template v-else>
      <form novalidate class="auth-form" @submit.prevent="submit">
        <div aria-live="polite" class="auth-messages">
          <p v-if="formError" class="alert alert--error" data-testid="form-error">
            {{ formError }}
          </p>
        </div>
        <p id="reset-hint" class="hint">
          Entre {{ MIN }} y {{ MAX }} caracteres, con al menos una letra y un número.
        </p>
        <PasswordField
          id="reset-password"
          v-model="password"
          label="Contraseña nueva"
          autocomplete="new-password"
          described-by="reset-hint"
          :error="passwordError"
        />
        <PasswordField
          id="reset-confirm"
          v-model="confirmation"
          label="Confirma la contraseña"
          autocomplete="new-password"
          :error="confirmError"
        />
        <button type="submit" class="btn btn--primary" :disabled="loading" :aria-busy="loading">
          <span v-if="loading" class="spinner" aria-hidden="true"></span>
          {{ loading ? 'Guardando…' : 'Guardar contraseña' }}
        </button>
      </form>
      <p class="auth-links">
        <RouterLink :to="{ name: 'login' }">Volver a iniciar sesión</RouterLink>
      </p>
    </template>
  </section>
</template>
