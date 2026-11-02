import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import App from '../../App.vue'
import { createAppRouter } from '../../router'
import { jsonResponse, ME, mockFetch, TOKENS } from '../../test/helpers'
import { useSessionStore } from '../../stores/session'

afterEach(() => vi.unstubAllGlobals())

/** Monta la app sin sesion (la cookie no es valida) en la ruta dada. */
async function mountAnonymous(
  path: string,
  extra: (url: string, init: RequestInit) => Response | Promise<Response> | undefined = () =>
    undefined,
) {
  const calls = mockFetch((url, init) => {
    const custom = extra(url, init)
    if (custom) return custom
    if (url.endsWith('/auth/refresh')) return jsonResponse(401, { code: 'INVALID_SESSION' })
    if (url.endsWith('/auth/login')) return jsonResponse(200, TOKENS)
    if (url.endsWith('/auth/me')) return jsonResponse(200, ME)
    return jsonResponse(404, {})
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createAppRouter(createMemoryHistory())
  router.push(path)
  await router.isReady()
  const wrapper = mount(App, { attachTo: document.body, global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, router, calls, session: useSessionStore() }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('LoginView', () => {
  it('CA-16: shows email, password with show/hide, "Ingresar", the recovery link and no sign-up', async () => {
    const { wrapper, session } = await mountAnonymous('/ingresar')
    expect(wrapper.find('[data-testid="auth-layout"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="auth-panel"]').classes()).toContain('auth-panel--side')
    expect(wrapper.find('label[for="login-email"]').text()).toBe('Correo electrónico')
    expect(wrapper.find('label[for="login-password"]').text()).toBe('Contraseña')
    const password = wrapper.find('#login-password')
    expect(password.attributes('type')).toBe('password')
    await wrapper.find('.field__toggle').trigger('click')
    expect(password.attributes('type')).toBe('text')
    expect(wrapper.find('.field__toggle').attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('button[type="submit"]').text()).toBe('Ingresar')
    expect(wrapper.text()).toContain('¿Olvidaste tu contraseña?')
    expect(wrapper.text().toLowerCase()).not.toContain('registr')
    expect(wrapper.find('a[href="/recuperar"]').exists()).toBe(true)
    session.dispose()
  })

  it('validates the fields before sending anything', async () => {
    const { wrapper, calls, session } = await mountAnonymous('/ingresar')
    const before = calls.length
    await wrapper.find('#login-email').setValue('not-an-email')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('Ingresa un correo electrónico válido.')
    expect(wrapper.text()).toContain('Ingresa tu contraseña.')
    expect(wrapper.find('#login-email').attributes('aria-invalid')).toBe('true')
    expect(wrapper.find('#login-email').attributes('aria-describedby')).toBe('login-email-error')
    expect(calls.length).toBe(before)
    session.dispose()
  })

  it('CA-16: the button is disabled with a loading state while sending', async () => {
    let release: (r: Response) => void = () => {}
    const { wrapper, session } = await mountAnonymous('/ingresar', (url) =>
      url.endsWith('/auth/login') ? new Promise<Response>((r) => (release = r)) : undefined,
    )
    await wrapper.find('#login-email').setValue('ana@example.test')
    await wrapper.find('#login-password').setValue('Secret123')
    await wrapper.find('form').trigger('submit')
    const button = wrapper.find('button[type="submit"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('aria-busy')).toBe('true')
    expect(button.text()).toContain('Ingresando')
    release(jsonResponse(401, { code: 'INVALID_CREDENTIALS' }))
    await flushPromises()
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
    session.dispose()
  })

  it('shows the same generic message for 401, keeps what was typed and announces it', async () => {
    const { wrapper, session } = await mountAnonymous('/ingresar', (url) =>
      url.endsWith('/auth/login')
        ? jsonResponse(401, { code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas' })
        : undefined,
    )
    await wrapper.find('#login-email').setValue('ana@example.test')
    await wrapper.find('#login-password').setValue('Wrong1234')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    const error = wrapper.find('[data-testid="form-error"]')
    expect(error.text()).toBe('El correo o la contraseña no son correctos.')
    expect(error.element.closest('[aria-live]')).not.toBeNull()
    expect((wrapper.find('#login-email').element as HTMLInputElement).value).toBe(
      'ana@example.test',
    )
    expect((wrapper.find('#login-password').element as HTMLInputElement).value).toBe('Wrong1234')
    session.dispose()
  })

  it('CA-20: network failure and 5xx show a generic message and re-enable the button', async () => {
    const { wrapper, session } = await mountAnonymous('/ingresar')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await wrapper.find('#login-email').setValue('ana@example.test')
    await wrapper.find('#login-password').setValue('Secret123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('[data-testid="form-error"]').text()).toContain('No pudimos conectar')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
    expect((wrapper.find('#login-email').element as HTMLInputElement).value).toBe(
      'ana@example.test',
    )

    mockFetch(() => jsonResponse(503, { message: 'detalle interno' }))
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    const text = wrapper.find('[data-testid="form-error"]').text()
    expect(text).toContain('Ocurrió un error inesperado')
    expect(text).not.toContain('detalle interno')
    session.dispose()
  })

  it('429 shows the wait time from Retry-After', async () => {
    const { wrapper, session } = await mountAnonymous('/ingresar', (url) =>
      url.endsWith('/auth/login')
        ? jsonResponse(429, { code: 'TOO_MANY_ATTEMPTS' }, { 'Retry-After': '300' })
        : undefined,
    )
    await wrapper.find('#login-email').setValue('ana@example.test')
    await wrapper.find('#login-password').setValue('Secret123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('[data-testid="form-error"]').text()).toContain('5 minutos')
    session.dispose()
  })

  it('does not follow an external redirect after login', async () => {
    const { wrapper, router, session } = await mountAnonymous('/ingresar?redirect=//evil.example')
    await wrapper.find('#login-email').setValue('ana@example.test')
    await wrapper.find('#login-password').setValue('Secret123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/')
    session.dispose()
  })
})

describe('ForgotPasswordView', () => {
  it('CA-17: is centered, validates, and shows the same confirmation whatever the answer', async () => {
    const { wrapper, calls, session } = await mountAnonymous('/recuperar', (url) =>
      url.endsWith('/password-reset/request') ? jsonResponse(202, { message: 'ok' }) : undefined,
    )
    expect(wrapper.find('[data-testid="auth-panel"]').classes()).toContain('auth-panel--center')
    expect(wrapper.find('a[href="/ingresar"]').text()).toBe('Volver a iniciar sesión')
    await wrapper.find('#forgot-email').setValue('nope')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('Ingresa un correo electrónico válido.')
    expect(calls.some((c) => c.url.endsWith('/password-reset/request'))).toBe(false)

    await wrapper.find('#forgot-email').setValue('ana@example.test')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    const sent = calls.find((c) => c.url.endsWith('/password-reset/request'))!
    expect(sent.init.body).toBe('{"email":"ana@example.test"}')
    expect(wrapper.find('[data-testid="sent-confirmation"]').text()).toContain(
      'Si el correo corresponde a una cuenta activa',
    )
    session.dispose()
  })

  it('CA-20: network failure keeps the typed email and re-enables the button', async () => {
    const { wrapper, session } = await mountAnonymous('/recuperar')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await wrapper.find('#forgot-email').setValue('ana@example.test')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('[data-testid="form-error"]').text()).toContain('No pudimos conectar')
    expect((wrapper.find('#forgot-email').element as HTMLInputElement).value).toBe(
      'ana@example.test',
    )
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
    session.dispose()
  })
})

describe('ResetPasswordView', () => {
  const TOKEN = 'abc_DEF-123'

  it('CA-17: reads the token from the fragment, removes it from the URL and is centered', async () => {
    window.history.replaceState(null, '', `/restablecer#token=${TOKEN}`)
    const { wrapper, session } = await mountAnonymous(`/restablecer#token=${TOKEN}`)
    expect(wrapper.find('[data-testid="auth-panel"]').classes()).toContain('auth-panel--center')
    expect(window.location.hash).toBe('')
    expect(window.location.href).not.toContain(TOKEN)
    expect(wrapper.find('form').exists()).toBe(true)
    session.dispose()
  })

  it('CA-17: validates the policy and the confirmation before sending', async () => {
    const { wrapper, calls, session } = await mountAnonymous(`/restablecer#token=${TOKEN}`)
    const before = calls.length
    await wrapper.find('#reset-password').setValue('short')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('Debe tener entre 8 y 128 caracteres.')
    await wrapper.find('#reset-password').setValue('onlyletters')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('Debe incluir al menos un número.')
    await wrapper.find('#reset-password').setValue('12345678')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('Debe incluir al menos una letra.')
    await wrapper.find('#reset-password').setValue('Valid1234')
    await wrapper.find('#reset-confirm').setValue('Valid12345')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('Las contraseñas no coinciden.')
    expect(calls.length).toBe(before)
    expect(wrapper.find('#reset-password').attributes('aria-describedby')).toContain('reset-hint')
    session.dispose()
  })

  it('sends the token and the new password, then offers to sign in', async () => {
    const { wrapper, calls, session } = await mountAnonymous(
      `/restablecer#token=${TOKEN}`,
      (url) => (url.endsWith('/password-reset/confirm') ? jsonResponse(204) : undefined),
    )
    await wrapper.find('#reset-password').setValue('Valid1234')
    await wrapper.find('#reset-confirm').setValue('Valid1234')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    const sent = calls.find((c) => c.url.endsWith('/password-reset/confirm'))!
    expect(JSON.parse(sent.init.body as string)).toEqual({ token: TOKEN, newPassword: 'Valid1234' })
    expect(wrapper.find('[data-testid="reset-done"]').text()).toContain(
      'Tu contraseña se actualizó',
    )
    expect(wrapper.find('[data-testid="reset-done"] a').attributes('href')).toBe('/ingresar')
    session.dispose()
  })

  it('an invalid or missing token offers to request a new link', async () => {
    const missing = await mountAnonymous('/restablecer')
    expect(missing.wrapper.find('[data-testid="link-invalid"]').exists()).toBe(true)
    expect(missing.wrapper.find('a[href="/recuperar"]').exists()).toBe(true)
    missing.session.dispose()
    document.body.innerHTML = ''

    const { wrapper, session } = await mountAnonymous(`/restablecer#token=${TOKEN}`, (url) =>
      url.endsWith('/password-reset/confirm')
        ? jsonResponse(400, { code: 'INVALID_RESET_TOKEN', message: 'x' })
        : undefined,
    )
    await wrapper.find('#reset-password').setValue('Valid1234')
    await wrapper.find('#reset-confirm').setValue('Valid1234')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('[data-testid="link-invalid"]').text()).toContain(
      'no es válido o ya expiró',
    )
    session.dispose()
  })

  it('CA-20: network failure keeps the typed passwords and re-enables the button', async () => {
    const { wrapper, session } = await mountAnonymous(`/restablecer#token=${TOKEN}`)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await wrapper.find('#reset-password').setValue('Valid1234')
    await wrapper.find('#reset-confirm').setValue('Valid1234')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('[data-testid="form-error"]').text()).toContain('No pudimos conectar')
    expect((wrapper.find('#reset-password').element as HTMLInputElement).value).toBe('Valid1234')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
    session.dispose()
  })
})

describe('AuthLayout', () => {
  it('CA-17: moving between the public views keeps the same background element mounted', async () => {
    const { wrapper, router, session } = await mountAnonymous('/ingresar')
    const background = wrapper.find('.auth-layout__bg').element
    await wrapper.find('a[href="/recuperar"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('forgot-password')
    expect(wrapper.find('.auth-layout__bg').element).toBe(background)
    expect(wrapper.find('[data-testid="auth-panel"]').classes()).toContain('auth-panel--center')
    await wrapper.find('a[href="/ingresar"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('.auth-layout__bg').element).toBe(background)
    expect(wrapper.find('[data-testid="auth-panel"]').classes()).toContain('auth-panel--side')
    session.dispose()
  })

  it('CA-18: every form control has an associated label and the background is decorative', async () => {
    for (const path of ['/ingresar', '/recuperar', `/restablecer#token=x`]) {
      const { wrapper, session } = await mountAnonymous(path)
      for (const input of wrapper.findAll('input')) {
        const id = input.attributes('id')!
        expect(wrapper.find(`label[for="${id}"]`).exists()).toBe(true)
      }
      expect(wrapper.find('.auth-layout__bg').attributes('aria-hidden')).toBe('true')
      expect(wrapper.find('h1').exists()).toBe(true)
      session.dispose()
      wrapper.unmount()
      document.body.innerHTML = ''
    }
  })
})
