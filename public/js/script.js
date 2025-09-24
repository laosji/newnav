// =================================================================================
// Error Handling Module
// =================================================================================
class ErrorHandler {
    static showUserFriendlyError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4757;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(255, 71, 87, 0.3);
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
        `;
        errorDiv.textContent = message;

        document.body.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.parentNode.removeChild(errorDiv);
                }
            }, 300);
        }, 5000);
    }
}

// =================================================================================
// Data Management Module
// =================================================================================
class DataManager {
    constructor() {
        this.sitesData = [];
        this.quickSitesData = [];
        this.DATA_CONFIG = {
            sitesUrl: 'data/sites.json',
            quickSitesUrl: 'data/quick-sites.json',
            fallback: [
                'https://cdn.jsdelivr.net/gh/laosji/newnav@main/sites.json',
                'https://cdn.jsdelivr.net/gh/laosji/newnav@main/quick-sites.json'
            ]
        };
    }

    async loadData() {
        try {
            const [sitesResponse, quickSitesResponse] = await Promise.all([
                this._fetchWithTimeout(this.DATA_CONFIG.sitesUrl),
                this._fetchWithTimeout(this.DATA_CONFIG.quickSitesUrl)
            ]);

            if (sitesResponse.ok && quickSitesResponse.ok) {
                [this.sitesData, this.quickSitesData] = await Promise.all([
                    sitesResponse.json(),
                    quickSitesResponse.json()
                ]);
                return;
            }
        } catch (error) {
            console.warn('Main data source failed, trying fallback', error);
        }

        try {
            const [sitesResponse, quickSitesResponse] = await Promise.all([
                this._fetchWithTimeout(this.DATA_CONFIG.fallback[0]),
                this._fetchWithTimeout(this.DATA_CONFIG.fallback[1])
            ]);

            if (sitesResponse.ok && quickSitesResponse.ok) {
                [this.sitesData, this.quickSitesData] = await Promise.all([
                    sitesResponse.json(),
                    quickSitesResponse.json()
                ]);
                return;
            }
        } catch (error) {
            console.warn('Fallback data source failed, using local data', error);
            this._loadLocalData();
        }
    }

    _fetchWithTimeout(url, timeout = 5000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
    }

    _loadLocalData() {
        this.sitesData = [
            { id: 1, name: "Google", description: "全球最大的搜索引擎", url: "https://www.google.com", icon: "🔍", category: "others" },
            { id: 2, name: "GitHub", description: "开发者代码托管平台", url: "https://github.com", icon: "👨‍💻", category: "others" },
            { id: 3, name: "ChatGPT", description: "AI智能对话助手", url: "https://chat.openai.com", icon: "🤖", category: "ai" }
        ];
        this.quickSitesData = [
            { name: "Google", icon: "🔍", url: "https://www.google.com" },
            { name: "GitHub", icon: "👨‍💻", url: "https://github.com" },
            { name: "ChatGPT", icon: "🤖", url: "https://chat.openai.com" }
        ];
    }

    getSites() {
        return this.sitesData;
    }

    getQuickSites() {
        return this.quickSitesData;
    }

    filterSites(category, searchQuery) {
        return this.sitesData.filter(site => {
            const matchesCategory = category === 'all' || site.category === category;
            const matchesSearch = !searchQuery ||
                site.name.toLowerCase().includes(searchQuery) ||
                site.description.toLowerCase().includes(searchQuery);
            return matchesCategory && matchesSearch;
        });
    }

    categorizeSites(sites) {
        return sites.reduce((acc, site) => {
            if (!acc[site.category]) {
                acc[site.category] = [];
            }
            acc[site.category].push(site);
            return acc;
        }, {});
    }
}

// =================================================================================
// UI Management Module
// =================================================================================
class UIManager {
    constructor() {
        this.elements = {
            loading: document.getElementById('loading'),
            quickSites: document.getElementById('quick-sites'),
            categoriesContainer: document.getElementById('categories-container'),
            filterBtns: document.querySelectorAll('.filter-btn')
        };
        this.iconCache = new Map();
        this.FAVICON_CONFIG = {
            enabled: true,
            cacheExpire: 24 * 60 * 60 * 1000,
            loadTimeout: 2000,
            services: {
                cloudflare: {
                    url: (domain) => `/cdn-cgi/image/width=32,height=32,format=auto/https://www.google.com/s2/favicons?domain=${domain}&sz=32`
                }
            }
        };
    }

    showLoading() {
        this.elements.loading.style.display = 'flex';
    }

    hideLoading() {
        this.elements.loading.style.display = 'none';
    }

    render(sites, quickSites, category, searchQuery) {
        this.renderQuickSites(quickSites);
        this.renderMainContent(sites, category, searchQuery);
    }

    renderQuickSites(quickSites) {
        if (!quickSites || !quickSites.length) return;
        this.elements.quickSites.innerHTML = quickSites.map(site => this._getQuickSiteHtml(site)).join('');
    }

    renderMainContent(sites, category, searchQuery) {
        const filteredSites = this._filterSites(sites, category, searchQuery);
        const categorizedSites = this._categorizeSites(filteredSites);

        if (Object.keys(categorizedSites).length === 0) {
            this.elements.categoriesContainer.innerHTML = this._getNoResultsHtml(searchQuery);
            return;
        }

        this.elements.categoriesContainer.innerHTML = Object.entries(categorizedSites)
            .map(([cat, siteList]) => this._getCategorySectionHtml(cat, siteList, searchQuery))
            .join('');
    }

    setActiveCategory(category) {
        this.elements.filterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-category') === category);
        });
    }

    // Private helper methods for rendering
    _getQuickSiteHtml(site) {
        const iconHtml = this._renderIcon(site.icon, 'default');
        return `
            <a href="${site.url}" class="quick-item" target="_blank" rel="noopener noreferrer">
                <div class="quick-icon">${iconHtml}</div>
                <span class="quick-title">${site.name}</span>
            </a>`;
    }

    _getCategorySectionHtml(category, sites, searchQuery) {
        const categoryInfo = this._getCategoryInfo(category);
        return `
            <section class="category-section" data-category="${category}">
                <div class="category-header">
                    <div class="category-title">
                        <span class="category-icon">${categoryInfo.icon}</span>
                        ${categoryInfo.name}
                    </div>
                    <p class="category-desc">${categoryInfo.description}</p>
                </div>
                <div class="category-grid">
                    ${sites.map(site => this._getSiteCardHtml(site, searchQuery)).join('')}
                </div>
            </section>`;
    }

    _getSiteCardHtml(site, searchQuery) {
        const highlightedName = this._highlightSearchTerm(site.name, searchQuery);
        const highlightedDesc = this._highlightSearchTerm(site.description, searchQuery);
        const iconHtml = this._renderIcon(site.icon);
        return `
            <a href="${site.url}" class="category-card" target="_blank" rel="noopener noreferrer" data-site-id="${site.id}">
                <div class="card-icon">${iconHtml}</div>
                <div class="card-content">
                    <h3 class="card-title">${highlightedName}</h3>
                    <p class="card-desc">${highlightedDesc}</p>
                </div>
            </a>`;
    }

    _renderIcon(iconData) {
        if (typeof iconData === 'string' && (iconData.startsWith('http') || iconData.startsWith('//'))) {
            return `<img src="${iconData}" class="site-favicon icon-default" alt="favicon" loading="lazy">`;
        }
        return `<span class="site-emoji icon-default">${iconData || '🌐'}</span>`;
    }

    _highlightSearchTerm(text, searchQuery) {
        if (!searchQuery) return text;
        const regex = new RegExp(`(${this._escapeRegExp(searchQuery)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    _escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    _getCategoryInfo(category) {
        const categoryMap = {
            ai: { name: 'AI 工具', icon: '🤖', description: '人工智能驱动的创新应用' },
            overseas_bank: { name: '境外银行账户', icon: '🏦', description: '境外银行开户与账户管理服务' },
            securities: { name: '港美股券商', icon: '📈', description: '港美股投资交易平台' },
            overseas_sim: { name: '境外手机卡', icon: '📱', description: '境外手机卡与通信服务' },
            ucard: { name: 'U卡推荐', icon: '💳', description: '支持U存U取的银行卡' },
            crypto_exchange: { name: '数字货币交易所', icon: '₿', description: '买卖比特币、以太坊等数字货币' },
            crypto_wallet: { name: '加密钱包', icon: '🛡️', description: '存储、管理你的数字资产' },
            others: { name: '其他', icon: '📦', description: '其他实用工具与服务' }
        };
        return categoryMap[category] || { name: category, icon: '🌐', description: '' };
    }

    _getNoResultsHtml(searchQuery) {
        return `
            <div class="category-section visible">
                <div class="category-header">
                    <h3 style="color: var(--text-secondary);">${searchQuery ? '未找到相关网站' : '暂无内容'}</h3>
                    <p style="color: var(--text-secondary);">${searchQuery ? '尝试其他关键词或浏览其他分类' : '请稍后再试'}</p>
                </div>
            </div>`;
    }

    // These methods are not fully implemented as they depend on the main app state
    _filterSites(sites, category, searchQuery) {
        return sites.filter(site =>
            (category === 'all' || site.category === category) &&
            (!searchQuery || site.name.toLowerCase().includes(searchQuery) || site.description.toLowerCase().includes(searchQuery))
        );
    }

    _categorizeSites(sites) {
        return sites.reduce((acc, site) => {
            (acc[site.category] = acc[site.category] || []).push(site);
            return acc;
        }, {});
    }
}

// =================================================================================
// Main Application
// =================================================================================
class NavigationApp {
    constructor() {
        this.dataManager = new DataManager();
        this.uiManager = new UIManager();
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.elements = {
            searchInput: document.querySelector('.search-input'),
            filterBtns: document.querySelectorAll('.filter-btn'),
            footerLinks: document.querySelectorAll('.footer-section a[data-category]')
        };
    }

    async init() {
        try {
            this.uiManager.showLoading();
            await this.dataManager.loadData();
            this.render();
            this.initEventListeners();
            this.initServiceWorker();
        } catch (error) {
            ErrorHandler.showUserFriendlyError('初始化失败，请刷新页面重试');
            console.error('Initialization failed:', error);
        } finally {
            this.uiManager.hideLoading();
        }
    }

    initEventListeners() {
        this.elements.searchInput.addEventListener('input', this._debounce(this.handleSearch.bind(this), 300));
        this.elements.filterBtns.forEach(btn => btn.addEventListener('click', () => this.handleCategoryFilter(btn)));
        this.elements.footerLinks.forEach(link => link.addEventListener('click', (e) => {
            e.preventDefault();
            this.setActiveCategory(link.getAttribute('data-category'));
        }));
    }

    handleSearch(event) {
        this.searchQuery = event.target.value.trim().toLowerCase();
        this.render();
    }

    handleCategoryFilter(clickedBtn) {
        const category = clickedBtn.getAttribute('data-category');
        this.setActiveCategory(category);
    }

    setActiveCategory(category) {
        if (this.currentCategory === category) return;
        this.currentCategory = category;
        this.searchQuery = '';
        this.elements.searchInput.value = '';
        this.uiManager.setActiveCategory(category);
        this.render();
    }

    render() {
        const sites = this.dataManager.getSites();
        const quickSites = this.dataManager.getQuickSites();
        this.uiManager.render(sites, quickSites, this.currentCategory, this.searchQuery);
    }

    async initServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered with scope:', registration.scope);
                if (navigator.serviceWorker.controller) {
                    this.requestBackgroundSync();
                }
            } catch (error) {
                console.warn('Service Worker registration failed:', error);
            }
        }
    }

    async requestBackgroundSync() {
        try {
            const registration = await navigator.serviceWorker.ready;
            if ('sync' in registration) {
                await registration.sync.register('background-sync');
                console.log('Background sync registered');
            }
        } catch (error) {
            console.warn('Background sync registration failed:', error);
        }
    }

    _debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    const app = new NavigationApp();
    app.init();
});
