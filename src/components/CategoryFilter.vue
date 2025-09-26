<template>
  <section class="category-filter">
    <div class="container">
      <div class="filter-wrapper">
        <button
          v-for="category in categories"
          :key="category.key"
          class="filter-btn"
          :class="{ active: currentCategory === category.key }"
          @click="setCategory(category.key)"
        >
          <span class="filter-icon">{{ category.icon }}</span>
          {{ category.name }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useDataStore } from '@/stores/dataStore'
import { storeToRefs } from 'pinia'

const dataStore = useDataStore()
const { categories, currentCategory } = storeToRefs(dataStore)

function setCategory(category) {
  dataStore.setCategory(category)
}
</script>