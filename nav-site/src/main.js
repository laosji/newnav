<template>
  <div class="app">
    <NavHeader @search="handleSearch" />
    <CategoryFilter 
      :current-category="currentCategory"
      :categories="categories"
      @category-change="handleCategoryChange" 
    />
    <QuickAccess :sites="quickSites" />
    <main class="main-content">
      <div class="container">
        <div v-if="loading" class="loading">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>
        <div v-else class="categories-wrapper">
          <CategorySection
            v-for="(sites, category) in categorizedSites"
            :key="category"
            :category="category"
            :sites="sites"
            :search-query="searchQuery"
          />
        </div>
        <div v-if="!loading && Object.keys(categorizedSites).length === 0" 
             class="empty-state">
          <h3>{{ searchQuery ? '未找到相关网站' : '暂无内容' }}</h3>
          <p>{{ searchQuery ? '尝试其他关键词' : '请稍后再试' }}</p>
        </div>
      </div>
    </main>
    <AppFooter :categories="categories" @category-change="handleCategoryChange" />
  </div>
</template>
<script>
import { ref, computed, onMounted } from 'vue'
import NavHeader from './components/NavHeader.vue'
import CategoryFilter from './components/CategoryFilter.vue'
import QuickAccess from './components/QuickAccess.vue'
import CategorySection from './components/CategorySection.vue'
import AppFooter from './components/AppFooter.vue'
export default {
  name: 'App',
  components: {
    NavHeader,
    CategoryFilter,
    QuickAccess,
    CategorySection,
    AppFooter
  },
  setup() {
    const sites = ref([])
    const quickSites = ref([])
    const loading = ref(true)
    const searchQuery = ref('')
    const currentCategory = ref('all')
    const categories = [
      { key: 'all', name: '全部', icon: '🏠' },
      { key: 'overseas_bank', name: '境外银行', icon: '🏦' },
      { key: 'ucard', name: 'U卡推荐', icon: '💳' },
      { key: 'securities', name: '港美股券商', icon: '📈' },
      { key: 'crypto_exchange', name: '数字货币交易所', icon: '₿' },
      { key: 'crypto_wallet', name: '加密钱包', icon: '🛡️' },
      { key: 'overseas_sim', name: '境外手机卡', icon: '📱' },
      { key: 'ai', name: 'AI 工具', icon: '🤖' },
      { key: 'others', name: '其他', icon: '📦' }
    ]
    const filteredSites = computed(() => {
      return sites.value.filter(site => {
        const matchesCategory = currentCategory.value === 'all' || 
                               site.category === currentCategory.value
        const matchesSearch = !searchQuery.value ||
          site.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
          (site.description && 
           site.description.toLowerCase().includes(searchQuery.value.toLowerCase()))
        return matchesCategory && matchesSearch
      })
    })
    const categorizedSites = computed(() => {
      const result = {}
      filteredSites.value.forEach(site => {
        if (!result[site.category]) {
          result[site.category] = []
        }
        result[site.category].push(site)
      })
      return result
    })
    const loadData = async () => {
      try {
        const [sitesResponse, quickSitesResponse] = await Promise.all([
          fetch('/data/sites.json'),
          fetch('/data/quick-sites.json')
        ])
        if (sitesResponse.ok) {
          sites.value = await sitesResponse.json()
        }
        if (quickSitesResponse.ok) {
          quickSites.value = await quickSitesResponse.json()
        }
        if (!sitesResponse.ok) {
          sites.value = [
            {
              id: 1,
              name: "ChatGPT",
              description: "AI智能对话助手",
              url: "https://chat.openai.com",
              icon: "🤖",
              category: "ai"
            }
          ]
          quickSites.value = [
            { name: "ChatGPT", icon: "🤖", url: "https://chat.openai.com" }
          ]
        }
      } catch (error) {
        console.error('数据加载失败:', error)
      } finally {
        loading.value = false
      }
    }
    const handleSearch = (query) => {
      searchQuery.value = query
      if (query && currentCategory.value !== 'all') {
        currentCategory.value = 'all'
      }
    }
    const handleCategoryChange = (category) => {
      currentCategory.value = category
      searchQuery.value = ''
    }
    onMounted(() => {
      loadData()
    })
    return {
      sites,
      quickSites,
      loading,
      searchQuery,
      currentCategory,
      categories,
      categorizedSites,
      handleSearch,
      handleCategoryChange
    }
  }
}
</script>
