// 修复后的导航网站脚本
// 全局变量
let sitesData = [];
let currentCategory = 'all';
let searchQuery = '';

// 性能优化：图标缓存
const iconCache = new Map();
const imageValidationCache = new Map();

// 修复数据源配置
const DATA_CONFIG = {
    // 主数据源
    sitesUrl: 'data/sites.json',
    quickSitesUrl: 'data/quick-sites.json',

    // 备用数据源
    fallback: {
        sitesUrl: 'https://cdn.jsdelivr.net/gh/laosji/newnav@main/sites.json',
        quickSitesUrl: 'https://cdn.jsdelivr.net/gh/laosji/newnav@main/quick-sites.json'
    }
};

// 优化后的Favicon配置
const FAVICON_CONFIG = {
    enabled: true,
    preferJsonIcon: true,
    service: 'google',
    services: {
        google: {
            url: (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
            fallback: true
        }
    },
    cacheExpire: 24 * 60 * 60 * 1000,
    loadTimeout: 3000,
    maxConcurrent: 4
};

// DOM 元素缓存
const elements = {};

// 初始化 DOM 元素
function initElements() {
    elements.loading = document.getElementById('loading');
    elements.searchInput = document.querySelector('.search-input');
    elements.filterBtns = document.querySelectorAll('.filter-btn');
    elements.quickSites = document.getElementById('quick-sites');
    elements.categoriesContainer = document.getElementById('categories-container');
    elements.navLinks = document.querySelectorAll('.nav-link');
    elements.footerLinks = document.querySelectorAll('.footer-section a[data-category]');
}

// 初始化 - 修复版本
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('开始初始化...');

        // 初始化 DOM 元素
        initElements();

        // 检查必需元素是否存在
        if (!elements.loading || !elements.categoriesContainer) {
            throw new Error('关键DOM元素缺失');
        }

        showLoading();

        // 加载数据
        await loadDataWithFallback();

        // 初始化界面
        initEventListeners();
        renderContent();

        hideLoading();
        console.log('初始化完成');

    } catch (error) {
        console.error('初始化失败:', error);
        showError('页面加载失败，请刷新重试');
        hideLoading();
    }
});

// 修复的数据加载函数
async function loadDataWithFallback() {
    console.log('开始加载数据...');

    // 首先尝试从当前目录加载
    try {
        const sitesResponse = await fetch(DATA_CONFIG.sitesUrl);
        const quickSitesResponse = await fetch(DATA_CONFIG.quickSitesUrl);

        if (sitesResponse.ok && quickSitesResponse.ok) {
            const [sites, quickSites] = await Promise.all([
                sitesResponse.json(),
                quickSitesResponse.json()
            ]);

            if (Array.isArray(sites) && sites.length > 0) {
                sitesData = sites;
                renderQuickSites(quickSites || []);
                console.log('数据加载成功:', sitesData.length, '个网站');
                return;
            }
        }
    } catch (error) {
        console.warn('主数据源加载失败:', error);
    }

    // 尝试备用路径
    try {
        const sitesResponse = await fetch(DATA_CONFIG.fallback.sitesUrl);
        const quickSitesResponse = await fetch(DATA_CONFIG.fallback.quickSitesUrl);

        if (sitesResponse.ok && quickSitesResponse.ok) {
            const [sites, quickSites] = await Promise.all([
                sitesResponse.json(),
                quickSitesResponse.json()
            ]);

            if (Array.isArray(sites) && sites.length > 0) {
                sitesData = sites;
                renderQuickSites(quickSites || []);
                console.log('备用数据源加载成功');
                return;
            }
        }
    } catch (error) {
        console.warn('备用数据源加载失败:', error);
    }

    // 使用内嵌数据作为最后备用方案
    console.warn('所有数据源都失败，使用内嵌数据');
    loadEmbeddedData();
}

// 修复图标获取函数
async function getFavicon(url, fallbackIcon = '🌐') {
    if (!FAVICON_CONFIG.enabled) {
        return fallbackIcon || '🌐';
    }

    // 如果是 emoji，直接返回
    if (fallbackIcon && typeof fallbackIcon === 'string' &&
        fallbackIcon.length <= 2 && /^\p{Emoji}+$/u.test(fallbackIcon)) {
        return fallbackIcon;
    }

    // 优先使用提供的图标URL
    if (fallbackIcon && typeof fallbackIcon === 'string' &&
        (fallbackIcon.startsWith('http') || fallbackIcon.startsWith('//'))) {

        // 简单验证图标是否可用
        try {
            const isValid = await validateImageQuick(fallbackIcon);
            if (isValid) {
                return fallbackIcon;
            }
        } catch (error) {
            console.warn('配置图标验证失败:', fallbackIcon, error);
        }
    }

    // 检查缓存
    const domain = extractDomain(url);
    if (!domain) return fallbackIcon || '🌐';

    const cached = iconCache.get(domain);
    if (cached && Date.now() - cached.timestamp < FAVICON_CONFIG.cacheExpire) {
        return cached.data;
    }

    try {
        // 使用 Google favicon 服务
        const service = FAVICON_CONFIG.services.google;
        const iconUrl = service.url(domain);

        const isValid = await validateImageQuick(iconUrl);
        if (isValid) {
            iconCache.set(domain, {
                data: iconUrl,
                timestamp: Date.now()
            });
            return iconUrl;
        }
    } catch (error) {
        console.warn(`获取 ${url} 的 favicon 失败:`, error);
    }

    // 缓存默认图标
    const defaultIcon = fallbackIcon || '🌐';
    iconCache.set(domain, {
        data: defaultIcon,
        timestamp: Date.now()
    });

    return defaultIcon;
}

// 修复图片验证函数
function validateImageQuick(url) {
    if (imageValidationCache.has(url)) {
        return Promise.resolve(imageValidationCache.get(url));
    }

    return new Promise((resolve) => {
        const img = new Image();
        const timeout = setTimeout(() => {
            img.onload = null;
            img.onerror = null;
            imageValidationCache.set(url, false);
            resolve(false);
        }, FAVICON_CONFIG.loadTimeout);

        img.onload = () => {
            clearTimeout(timeout);
            imageValidationCache.set(url, true);
            resolve(true);
        };

        img.onerror = () => {
            clearTimeout(timeout);
            imageValidationCache.set(url, false);
            resolve(false);
        };

        // 设置图片源
        try {
            img.src = url;
        } catch (error) {
            clearTimeout(timeout);
            imageValidationCache.set(url, false);
            resolve(false);
        }
    });
}

// 修复提取域名函数
function extractDomain(url) {
    if (!url || typeof url !== 'string') {
        return null;
    }

    try {
        // 如果URL不以协议开头，添加https://
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        const urlObj = new URL(url);
        return urlObj.hostname.replace(/^www\./, '');
    } catch (error) {
        console.warn('提取域名失败:', url, error);
        return null;
    }
}

// 修复渲染图标函数
function renderIcon(iconData, size = 'default') {
    const sizeClass = size === 'small' ? 'icon-small' : 'icon-default';

    // 如果是有效的URL
    if (typeof iconData === 'string' &&
        (iconData.startsWith('http') || iconData.startsWith('//'))) {
        return `
            <img src="${iconData}"
                 class="site-favicon ${sizeClass}"
                 alt="网站图标"
                 loading="lazy"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';"
                 onload="this.style.opacity='1';"
                 style="opacity: 0; transition: opacity 0.3s;">
            <span class="site-emoji ${sizeClass}" style="display:none;">🌐</span>
        `;
    }

    // 如果是emoji或其他字符
    return `<span class="site-emoji ${sizeClass}">${iconData || '🌐'}</span>`;
}

// 修复渲染快速访问
function renderQuickSites(quickSites) {
    if (!quickSites || !Array.isArray(quickSites) || quickSites.length === 0) {
        console.log('快速访问数据为空');
        if (elements.quickSites) {
            elements.quickSites.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">暂无快速访问数据</p>';
        }
        return;
    }

    const quickSitesHtml = quickSites.map((site) => {
        if (!site.name || !site.url) {
            console.warn('快速访问网站数据不完整:', site);
            return '';
        }

        const iconData = site.icon || '🌐';
        const safeName = escapeHtml(site.name);
        const safeUrl = escapeHtml(site.url);

        return `
            <a href="${safeUrl}" class="quick-item" target="_blank" rel="noopener noreferrer">
                <div class="quick-icon">${renderIcon(iconData, 'default')}</div>
                <span class="quick-title">${safeName}</span>
            </a>
        `;
    }).filter(html => html).join('');

    if (elements.quickSites) {
        elements.quickSites.innerHTML = quickSitesHtml;
    }
}

// 添加 HTML 转义函数
function escapeHtml(text) {
    if (!text || typeof text !== 'string') return '';

    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 修复事件监听器初始化
function initEventListeners() {
    // 搜索功能
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', debounce(handleSearch, 300));
        elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }

    // 分类过滤
    if (elements.filterBtns) {
        elements.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => handleCategoryFilter(btn));
        });
    }

    // 页脚分类链接
    if (elements.footerLinks) {
        elements.footerLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const category = link.getAttribute('data-category');
                if (category) {
                    setActiveCategory(category);
                }
            });
        });
    }
}

// 其他函数保持不变...
function handleSearch() {
    const newQuery = elements.searchInput ? elements.searchInput.value.trim().toLowerCase() : '';
    if (newQuery === searchQuery) return;

    searchQuery = newQuery;
    renderContent();
}

function handleCategoryFilter(clickedBtn) {
    const category = clickedBtn.getAttribute('data-category');
    setActiveCategory(category);
}

function setActiveCategory(category) {
    if (currentCategory === category) return;

    currentCategory = category;

    if (elements.filterBtns) {
        elements.filterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-category') === category);
        });
    }

    if (elements.searchInput) {
        elements.searchInput.value = '';
    }
    searchQuery = '';

    renderContent();
}

function renderContent() {
    if (!Array.isArray(sitesData) || sitesData.length === 0) {
        console.warn('网站数据为空，无法渲染内容');
        if (elements.categoriesContainer) {
            elements.categoriesContainer.innerHTML = `
                <div class="category-section visible">
                    <div class="category-header">
                        <h3 style="color: var(--text-secondary);">暂无数据</h3>
                        <p style="color: var(--text-secondary);">请检查网络连接或稍后再试</p>
                    </div>
                </div>
            `;
        }
        return;
    }

    const filteredSites = filterSites();
    const categorizedSites = categorizeSites(filteredSites);

    if (Object.keys(categorizedSites).length === 0) {
        if (elements.categoriesContainer) {
            elements.categoriesContainer.innerHTML = `
                <div class="category-section visible">
                    <div class="category-header">
                        <h3 style="color: var(--text-secondary);">
                            ${searchQuery ? '未找到相关网站' : '暂无内容'}
                        </h3>
                        <p style="color: var(--text-secondary);">
                            ${searchQuery ? '尝试其他关键词或浏览其他分类' : '请稍后再试'}
                        </p>
                    </div>
                </div>
            `;
        }
        return;
    }

    renderCategories(categorizedSites);
}

function renderCategories(categorizedSites) {
    if (!elements.categoriesContainer) return;

    const categoryHtmls = Object.entries(categorizedSites).map(([category, sites]) =>
        renderCategorySection(category, sites)
    );

    elements.categoriesContainer.innerHTML = categoryHtmls.join('');

    // 添加渐入动画
    setTimeout(() => {
        document.querySelectorAll('.category-section').forEach((section, index) => {
            setTimeout(() => {
                section.classList.add('visible');
            }, index * 50);
        });
    }, 100);
}

function filterSites() {
    return sitesData.filter(site => {
        if (!site || !site.name || !site.category) {
            return false;
        }

        const matchesCategory = currentCategory === 'all' || site.category === currentCategory;
        const matchesSearch = !searchQuery ||
            site.name.toLowerCase().includes(searchQuery) ||
            (site.description && site.description.toLowerCase().includes(searchQuery));

        return matchesCategory && matchesSearch;
    });
}

function categorizeSites(sites) {
    const categories = {};

    sites.forEach(site => {
        if (!site || !site.category) return;

        if (!categories[site.category]) {
            categories[site.category] = [];
        }
        categories[site.category].push(site);
    });

    return categories;
}

function renderCategorySection(category, sites) {
    const categoryInfo = getCategoryInfo(category);

    return `
        <section class="category-section" data-category="${category}">
            <div class="category-header">
                <div class="category-title">
                    <span class="category-icon">${categoryInfo.icon}</span>
                    ${escapeHtml(categoryInfo.name)}
                </div>
                <p class="category-desc">${escapeHtml(categoryInfo.description)}</p>
            </div>
            <div class="category-grid">
                ${sites.map(site => renderSiteCard(site)).join('')}
            </div>
        </section>
    `;
}

function renderSiteCard(site) {
    if (!site || !site.name || !site.url) {
        return '';
    }

    const highlightedName = highlightSearchTerm(escapeHtml(site.name));
    const highlightedDesc = highlightSearchTerm(escapeHtml(site.description || ''));
    const iconData = site.icon || '🌐';
    const safeUrl = escapeHtml(site.url);

    return `
        <a href="${safeUrl}" class="category-card" target="_blank" rel="noopener noreferrer"
           data-site-id="${site.id || ''}">
            <div class="card-icon">${renderIcon(iconData)}</div>
            <div class="card-content">
                <h3 class="card-title">${highlightedName}</h3>
                <p class="card-desc">${highlightedDesc}</p>
            </div>
        </a>
    `;
}

function highlightSearchTerm(text) {
    if (!searchQuery || !text) return text;

    const regex = new RegExp(`(${escapeRegExp(searchQuery)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getCategoryInfo(category) {
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

    return categoryMap[category] || {
        name: category || '未知分类',
        icon: '🌐',
        description: ''
    };
}

// 内嵌数据作为备用方案
function loadEmbeddedData() {
    // 从文档中提取的部分数据作为示例
    sitesData = [
        {
            "id": 34,
            "name": "ifast",
            "description": "英国虚拟银行，免费开户，无年费",
            "url": "https://www.ifastgb.com/tellafriend/chaod1702",
            "icon": "🏦",
            "category": "overseas_bank"
        },
        {
            "id": 35,
            "name": "wise",
            "description": "全球收付款，可申请实体卡",
            "url": "https://wise.com/invite/ihpc/duanc11",
            "icon": "💳",
            "category": "overseas_bank"
        },
        {
            "id": 3,
            "name": "ChatGPT",
            "description": "AI智能对话助手",
            "url": "https://chat.openai.com",
            "icon": "🤖",
            "category": "ai"
        },
        {
            "id": 54,
            "name": "Binance 币安",
            "description": "全球最大的数字货币交易平台之一",
            "url": "https://www.binance.com/zh-CN/activity/referral/offers/claim?ref=CPA_00U6B6DNIR",
            "icon": "₿",
            "category": "crypto_exchange"
        }
    ];

    const quickSites = [
        { name: "wise", icon: "💳", url: "https://wise.com/invite/ihpc/duanc11" },
        { name: "ifast", icon: "🏦", url: "https://www.ifastgb.com/tellafriend/chaod1702" },
        { name: "ChatGPT", icon: "🤖", url: "https://chat.openai.com" },
        { name: "Binance", icon: "₿", url: "https://www.binance.com" }
    ];

    renderQuickSites(quickSites);
    console.log('内嵌数据加载完成');
}

// 工具函数
function debounce(func, wait) {
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

function showLoading() {
    if (elements.loading) {
        elements.loading.classList.remove('hidden');
        elements.loading.style.display = 'flex';
    }
}

function hideLoading() {
    if (elements.loading) {
        elements.loading.classList.add('hidden');
        setTimeout(() => {
            elements.loading.style.display = 'none';
        }, 300);
    }
}

function showError(message) {
    console.error('错误:', message);

    // 创建错误提示
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
        max-width: 300px;
        font-size: 14px;
    `;
    errorDiv.textContent = message;

    document.body.appendChild(errorDiv);

    // 5秒后自动移除
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.style.opacity = '0';
            errorDiv.style.transform = 'translateX(100%)';
            errorDiv.style.transition = 'all 0.3s ease';
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.parentNode.removeChild(errorDiv);
                }
            }, 300);
        }
    }, 5000);
}

console.log('修复版导航脚本加载完成');
