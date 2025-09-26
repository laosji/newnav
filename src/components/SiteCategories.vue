<template>
  <main class="main-content">
    <div class="container">
      <div v-if="loading" class="loading-overlay">
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
      <div v-else class="categories-wrapper">
        <section
          v-for="(category, key) in categorizedSites"
          :key="key"
          class="category-section visible"
        >
          <div class="category-header">
            <h2 class="category-title">
              <span class="category-icon">{{ category.icon }}</span>
              {{ category.name }}
            </h2>
          </div>
          <div class="category-grid">
            <SiteCard v-for="site in category.sites" :key="site.id" :site="site" />
          </div>
        </section>
        <div v-if="!loading && Object.keys(categorizedSites).length === 0" class="empty-state">
          <h3>{{ searchQuery ? '未找到相关网站' : '暂无内容' }}</h3>
          <p>{{ searchQuery ? '尝试其他关键词' : '请稍后再试' }}</p>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { useDataStore } from '@/stores/dataStore'
import { storeToRefs } from 'pinia'
import SiteCard from './SiteCard.vue'

const dataStore = useDataStore()
const { loading, categorizedSites, searchQuery } = storeToRefs(dataStore)
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 4rem;
  color: var(--text-secondary);
}
</style>