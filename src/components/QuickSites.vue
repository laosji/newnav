<template>
  <section class="quick-access">
    <div class="container">
      <div class="section-header">
        <h2>快速访问</h2>
        <p>常用网站快速入口</p>
      </div>
      <div class="quick-grid">
        <a
          v-for="site in quickSites"
          :key="site.name"
          :href="site.url"
          target="_blank"
          class="quick-item"
          :title="site.name"
          :data-brand="extractDomain(site.url)"
        >
          <div class="quick-icon">
            <SiteIcon :icon="site.icon" :name="site.name" size="default" />
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
function extractDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    const parts = hostname.split('.').reverse();
    if (parts.length >= 2) {
      // 返回 e.g., 'google.com' or 'bbc.co.uk'
      return parts[1] + '.' + parts[0];
    }
    return hostname;
  } catch (error) {
    return ''; // 无效 URL 时返回空字符串
  }
}
</script>