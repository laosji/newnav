<template>
  <section class="category-section">
    <h2>{{ categoryName }}</h2>
    <div class="site-list">
      <div v-for="site in sites" :key="site.id" class="site-card">
        <a :href="site.url" target="_blank">
          <div class="site-icon">{{ site.icon }}</div>
          <div class="site-info">
            <h3>{{ site.name }}</h3>
            <p>{{ site.description }}</p>
          </div>
        </a>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  category: String,
  sites: Array,
  searchQuery: String
})

const categoryNames = {
  'overseas_bank': '境外银行',
  'ucard': 'U卡推荐',
  'securities': '港美股券商',
  'crypto_exchange': '数字货币交易所',
  'crypto_wallet': '加密钱包',
  'overseas_sim': '境外手机卡',
  'ai': 'AI 工具',
  'others': '其他'
}

const categoryName = computed(() => categoryNames[props.category] || props.category)
</script>

<style scoped>
.category-section {
  margin-bottom: 2rem;
}
.site-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}
.site-card {
  border: 1px solid #eee;
  border-radius: 8px;
  transition: box-shadow 0.3s;
}
.site-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}
.site-card a {
  display: flex;
  padding: 1rem;
  text-decoration: none;
  color: inherit;
}
.site-icon {
  font-size: 2rem;
  margin-right: 1rem;
}
.site-info h3 {
  margin: 0 0 0.5rem 0;
}
.site-info p {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
}
</style>