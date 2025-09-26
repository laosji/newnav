<template>
  <header class="nav-header">
    <div class="nav-container">
      <a href="/" class="nav-brand">
        <span class="brand-icon">⚡</span>
        <span class="brand-text">老司机导航</span>
      </a>
      <div class="search-wrapper">
        <div class="search-container">
          <span class="search-icon material-icons-round">search</span>
          <input
            type="text"
            class="search-input"
            placeholder="搜索网站或服务"
            :value="searchQuery"
            @input="updateSearchQuery($event.target.value)"
          >
        </div>
      </div>
      <nav class="nav-menu">
        <a href="https://www.youtube.com/@laosji" target="_blank" class="nav-link">我的YouTube</a>
        <a href="https://t.me/cjfuli/19" target="_blank" class="nav-link">订阅我的telegram频道</a>
        <a href="https://laosji.net/" target="_blank" class="nav-link">关于</a>
      </nav>
    </div>
  </header>
</template>

<script setup>
import { useDataStore } from '@/stores/dataStore'
import { storeToRefs } from 'pinia'

const dataStore = useDataStore()
const { searchQuery } = storeToRefs(dataStore)

function updateSearchQuery(value) {
  dataStore.setSearchQuery(value)
}
</script>