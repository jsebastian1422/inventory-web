import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  // En movil (< 768 px) la barra arranca cerrada; sin matchMedia (pruebas) queda abierta.
  const isMobile =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 767px)').matches
  const sidebarOpen = ref(!isMobile)
  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }
  return { sidebarOpen, toggleSidebar }
})
