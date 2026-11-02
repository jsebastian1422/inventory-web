import { createRouter, createWebHistory, type RouteRecordRaw, type RouterHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ForgotPasswordView from '../views/auth/ForgotPasswordView.vue'
import LoginView from '../views/auth/LoginView.vue'
import ResetPasswordView from '../views/auth/ResetPasswordView.vue'
import { installSessionGuard } from './guards'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    /** Ruta accesible sin sesion. Las demas exigen sesion. */
    public?: boolean
    /** Layout que envuelve la ruta. */
    layout?: 'auth' | 'dashboard'
    /** Posicion del formulario sobre el fondo (solo layout `auth`). */
    panel?: 'side' | 'center'
  }
}

export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: HomeView, meta: { title: 'Inicio', layout: 'dashboard' } },
  {
    path: '/ingresar',
    name: 'login',
    component: LoginView,
    meta: { title: 'Ingresar', public: true, layout: 'auth', panel: 'side' },
  },
  {
    path: '/recuperar',
    name: 'forgot-password',
    component: ForgotPasswordView,
    meta: { title: 'Recuperar contraseña', public: true, layout: 'auth', panel: 'center' },
  },
  {
    path: '/restablecer',
    name: 'reset-password',
    component: ResetPasswordView,
    meta: { title: 'Restablecer contraseña', public: true, layout: 'auth', panel: 'center' },
  },
  // Rutas desconocidas: la guarda decide entre `/` y el login.
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

/** Crea el router con la guarda de sesion instalada. */
export function createAppRouter(history: RouterHistory) {
  const created = createRouter({ history, routes })
  installSessionGuard(created)
  return created
}

export const router = createAppRouter(createWebHistory())
