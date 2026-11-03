<script setup lang="ts">
import { computed, ref } from 'vue'
import MenuColumnsControl from '../components/MenuColumnsControl.vue'
import ModuleCard from '../components/ModuleCard.vue'
import ModuleCardSkeleton from '../components/ModuleCardSkeleton.vue'
import { useModules } from '../modules/useModules'
import { readMenuColumns, writeMenuColumns } from '../preferences/menu-columns'
import { useSessionStore } from '../stores/session'

const session = useSessionStore()
const { visibleModules, isReady } = useModules()
const columns = ref(readMenuColumns())
const skeletonCount = computed(() => columns.value * 2)
const firstName = computed(() => session.user?.fullName.split(' ')[0] ?? '')

function setColumns(value: number): void {
  columns.value = value
  writeMenuColumns(value)
}
</script>

<template>
  <section class="home">
    <div class="home__head">
      <h2>
        Bienvenido<template v-if="firstName">, {{ firstName }}</template>
      </h2>
      <MenuColumnsControl :model-value="columns" @update:model-value="setColumns" />
    </div>
    <section
      aria-label="Módulos"
      :aria-busy="!isReady ? 'true' : 'false'"
      data-testid="modules-section"
    >
      <div v-if="!isReady" class="module-grid" :style="{ '--menu-pref': columns }">
        <ModuleCardSkeleton v-for="n in skeletonCount" :key="n" />
      </div>
      <p v-else-if="visibleModules.length === 0" class="module-empty" data-testid="modules-empty">
        Aún no tienes módulos asignados. Pide acceso a un administrador.
      </p>
      <div v-else class="module-grid" :style="{ '--menu-pref': columns }">
        <ModuleCard v-for="m in visibleModules" :key="m.id" :module="m" />
      </div>
    </section>
  </section>
</template>
