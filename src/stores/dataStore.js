import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useNotificationStore } from './notificationStore'

export const useDataStore = defineStore('data', () => {
  const sites = ref([])
  const quickSites = ref([])
  const categories = ref([
    { key: 'all', name: '全部', icon: '🏠' },
    { key: 'overseas_bank', name: '境外银行', icon: '🏦' },
    { key: 'ucard', name: 'U卡推荐', icon: '💳' },
    { key: 'securities', name: '港美股券商', icon: '📈' },
    { key: 'crypto_exchange', name: '数字货币交易所', icon: '₿' },
    { key: 'crypto_wallet', name: '加密钱包', icon: '🛡️' },
    { key: 'overseas_sim', name: '境外手机卡', icon: '📱' },
    { key: 'ai', name: 'AI 工具', icon: '🤖' },
    { key: 'others', name: '其他', icon: '📦' }
  ])
  const loading = ref(true)
  const searchQuery = ref('')
  const currentCategory = ref('all')

  const notificationStore = useNotificationStore()

  async function fetchData() {
    loading.value = true
    try {
      const [sitesResponse, quickSitesResponse] = await Promise.all([
        fetch('/data/sites.json'),
        fetch('/data/quick-sites.json')
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
      const category = site.category
      if (!result[category]) {
        result[category] = {
          name: categories.value.find(c => c.key === category)?.name || '其他',
          icon: categories.value.find(c => c.key === category)?.icon || '📦',
          sites: []
        }
      }
      result[category].sites.push(site)
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
    categories,
    loading,
    searchQuery,
    currentCategory,
    fetchData,
    categorizedSites,
    setSearchQuery,
    setCategory
  }
})