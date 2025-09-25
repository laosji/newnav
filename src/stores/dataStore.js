import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useNotificationStore } from './notificationStore'

const DATA_CONFIG = {
  sitesUrl: '/data/sites.json',
  quickSitesUrl: '/data/quick-sites.json',
  fallback: [] // 可以在这里添加备用 URL
}

export const useDataStore = defineStore('data', () => {
  const sites = ref([])
  const quickSites = ref([])

  const categoryInfo = computed(() => ({
    all: { name: '全部', icon: '🏠', description: '所有分类' },
    overseas_bank: { name: '境外银行', icon: '🏦', description: '各种境外银行服务' },
    ucard: { name: 'U卡推荐', icon: '💳', description: '推荐的U卡' },
    securities: { name: '港美股券商', icon: '📈', description: '港美股券商' },
    crypto_exchange: { name: '数字货币交易所', icon: '₿', description: '数字货币交易所' },
    crypto_wallet: { name: '加密钱包', icon: '🛡️', description: '加密钱包' },
    overseas_sim: { name: '境外手机卡', icon: '📱', description: '境外手机卡' },
    ai: { name: 'AI 工具', icon: '🤖', description: '人工智能工具' },
    others: { name: '其他', icon: '📦', description: '其他网站' },
    new_category: { name: '新分类', icon: '🆕', description: '新分类的描述' }
  }))

  // 转换成与之前 categories 兼容的数组格式
  const categories = computed(() =>
    Object.entries(categoryInfo.value).map(([key, value]) => ({ key, ...value }))
  )

  const loading = ref(true)
  const searchQuery = ref('')
  const currentCategory = ref('all')

  const notificationStore = useNotificationStore()

  async function fetchData() {
    loading.value = true
    try {
      const [sitesResponse, quickSitesResponse] = await Promise.all([
        fetch(DATA_CONFIG.sitesUrl),
        fetch(DATA_CONFIG.quickSitesUrl)
      ])

      if (!sitesResponse.ok || !quickSitesResponse.ok) {
        throw new Error('网络响应错误')
      }

      sites.value = await sitesResponse.json()
      quickSites.value = await quickSitesResponse.json()
      notificationStore.addNotification('数据加载成功！', 'success')

    } catch (error) {
      console.error('数据加载失败:', error)
      notificationStore.addNotification(`数据加载失败: ${error.message}`, 'error')
      // Fallback data
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
    } finally {
      loading.value = false
    }
  }

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
      const categoryKey = site.category
      if (!result[categoryKey]) {
        const info = categoryInfo.value[categoryKey] || categoryInfo.value.others
        result[categoryKey] = {
          name: info.name,
          icon: info.icon,
          sites: []
        }
      }
      result[categoryKey].sites.push(site)
    })
    return result
  })

  function setSearchQuery(query) {
    searchQuery.value = query
    if (query && currentCategory.value !== 'all') {
      currentCategory.value = 'all'
    }
  }

  function setCategory(category) {
    currentCategory.value = category
    searchQuery.value = ''
  }

  return {
    sites,
    quickSites,
    categories, // 仍然导出，以保持与现有组件的兼容性
    categoryInfo,
    loading,
    searchQuery,
    currentCategory,
    fetchData,
    categorizedSites,
    setSearchQuery,
    setCategory
  }
})