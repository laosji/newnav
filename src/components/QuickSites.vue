<template>
  <section class="quick-access">
    <div class="container">
      <div class="section-header">
        <h2>快速访问</h2>
        <p>常用网站快速入口</p>
      </div>
      <div class="quick-grid">
        <a v-for="site in quickSites" :key="site.name" :href="site.url" target="_blank" class="quick-item">
          <div class="quick-icon">
            <SiteIcon :icon="site.icon" :name="site.name" size="small" />
          </div>
          <span class="quick-title">{{ site.name }}</span>
        </a>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useDataStore } from '@/stores/dataStore'
import { storeToRefs } from 'pinia'
import SiteIcon from './SiteIcon.vue'

const dataStore = useDataStore()
const { quickSites } = storeToRefs(dataStore)
</script>