<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-content">
        <div class="footer-section">
          <h3>老司机导航</h3>
          <p>精选优质网站，提升效率体验</p>
        </div>
        <div class="footer-section">
          <h4>快速分类</h4>
          <a
            v-for="category in categories.filter(c => c.key !== 'all')"
            :key="category.key"
            href="#"
            @click.prevent="setCategory(category.key)"
          >
            {{ category.name }}
          </a>
        </div>
        <div class="footer-section">
          <h4>联系我们</h4>
          <a href="https://www.youtube.com/@laosji" target="_blank">YouTube 频道</a>
          <a href="#">反馈建议</a>
          <a href="#">关于我们</a>
          <a href="#">隐私政策</a>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2024 laosji导航. 保持简洁，专注效率。</p>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { useDataStore } from '@/stores/dataStore'
import { storeToRefs } from 'pinia'

const dataStore = useDataStore()
const { categories } = storeToRefs(dataStore)

function setCategory(category) {
  dataStore.setCategory(category)
  window.scrollTo(0, 0)
}
</script>