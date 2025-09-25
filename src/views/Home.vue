<template>
  <div>
    <NavHeader />
    <CategoryFilter />
    <QuickSites />
    <SiteCategories />
    <AppFooter />
  </div>
</template>

<script setup>
import NavHeader from '@/components/NavHeader.vue'
import CategoryFilter from '@/components/CategoryFilter.vue'
import QuickSites from '@/components/QuickSites.vue'
import SiteCategories from '@/components/SiteCategories.vue'
import AppFooter from '@/components/AppFooter.vue'
import { useDataStore } from '@/stores/dataStore'
import { onMounted } from 'vue'

const dataStore = useDataStore()

onMounted(() => {
  dataStore.fetchData()
})
</script>