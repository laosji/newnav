// 优化后的导航网站脚本 - Cloudflare Pages 版本
// 全局变量
let sitesData = [];
let currentCategory = 'all';
let searchQuery = '';

// 性能优化：图标缓存
const iconCache = new Map();
const imageValidationCache = new Map();

// 优化数据源配置，利用 Cloudflare CDN
const DATA_CONFIG = {
    // 主数据源：使用你的 Cloudflare Pages 域名
    sitesUrl: `${window.location.origin}/data/sites.json`,
    quickSitesUrl: `${window.location.origin}/data/quick-sites.json`,

    // 备用数据源：GitHub + jsDelivr CDN
    fallback: [
        'https://cdn.jsdelivr.net/gh/laosji/newnav@main/sites.json',
        'https://raw.githubusercontent.com/laosji/newnav/main/sites.json'
    ]
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
        },
        // 使用 Cloudflare 图片优化
        cloudflare: {
            url: (domain) => `/cdn-cgi/image/width=32,height=32,format=auto/https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
            fallback: true
        }
    },
    cacheExpire: 24 * 60 * 60 * 1000,
    loadTimeout: 2000, // 缩短超时时间
    maxConcurrent: 6   // 增加并发数
};

// DOM 元素缓存
const elements = {
    loading: document.getElementById('loading'),
    searchInput: document.querySelector('.search-input'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    quickSites: document.getElementById('quick-sites'),
    categoriesContainer: document.getElementById('categories-container'),
    navLinks: document.querySelectorAll('.nav-link'),
    footerLinks: document.querySelectorAll('.footer-section a[data-category]')
};

// 初始化 - 优化版本
document.addEventListener('DOMContentLoaded', async () => {
    try {
        showLoading();

        // 性能监控
        performance.mark('init-start');

        // 1. 加载数据
        await loadDataWithFallback();

        // 2. 初始化界面
        initEventListeners();
        renderContent();

        // 3. 性能监控
        performance.mark('init-end');
        performance.measure('init-duration', 'init-start', 'init-end');

        hideLoading();

        // 4. 延迟加载优化
        requestIdleCallback(() => {
            preloadCriticalResources();
            initServiceWorker();
        });

    } catch (error) {
        console.error('初始化失败:', error);
        showError('加载失败，请刷新页面重试');
        hideLoading();
    }
});

// 数据加载 - 带备用方案
async function loadDataWithFallback() {
    try {
        // 尝试主数据源
        const [sitesResponse, quickSitesResponse] = await Promise.all([
            fetchWithTimeout(DATA_CONFIG.sitesUrl, 5000),
            fetchWithTimeout(DATA_CONFIG.quickSitesUrl, 5000)
        ]);

        if (sitesResponse.ok && quickSitesResponse.ok) {
            const [sites, quickSites] = await Promise.all([
                sitesResponse.json(),
                quickSitesResponse.json()
            ]);

            sitesData = sites;
            renderQuickSites(quickSites);
            return;
        }
    } catch (error) {
        console.warn('主数据源加载失败，尝试备用方案:', error);
    }

    // 备用数据源
    try {
        const [sitesResponse, quickSitesResponse] = await Promise.all([
            fetchWithTimeout(DATA_CONFIG.fallback[0], 8000),
            fetchWithTimeout(DATA_CONFIG.fallback[1], 8000)
        ]);

        if (sitesResponse.ok && quickSitesResponse.ok) {
            const [sites, quickSites] = await Promise.all([
                sitesResponse.json(),
                quickSitesResponse.json()
            ]);

            sitesData = sites;
            renderQuickSites(quickSites);
            return;
        }
    } catch (error) {
        console.warn('备用数据源也失败，使用本地数据:', error);
    }

    // 最终备用方案
    loadLocalData();
}

// 带超时的 fetch
function fetchWithTimeout(url, timeout = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    return fetch(url, {
        signal: controller.signal,
        cache: 'default', // 利用浏览器缓存
        headers: {
            'Accept': 'application/json',
        }
    }).finally(() => {
        clearTimeout(timeoutId);
    });
}

// 优化的图标获取
async function getFavicon(url, fallbackIcon = '🌐') {
    if (!FAVICON_CONFIG.enabled) {
        return fallbackIcon || '🌐';
    }

    // 优先使用提供的图标
    if (fallbackIcon && typeof fallbackIcon === 'string' &&
        (fallbackIcon.startsWith('http') || fallbackIcon.startsWith('//'))) {
        return fallbackIcon;
    }

    // 检查缓存
    const domain = extractDomain(url);
    const cached = iconCache.get(domain);
    if (cached && Date.now() - cached.timestamp < FAVICON_CONFIG.cacheExpire) {
        return cached.data;
    }

    try {
        // 使用 Cloudflare 优化的 favicon 服务
        const service = FAVICON_CONFIG.services.cloudflare;
        const iconUrl = service.url(domain);

        // 异步验证图标
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

// 快速图片验证
function validateImageQuick(url) {
    return new Promise((resolve) => {
        const img = new Image();
        const timeout = setTimeout(() => {
            resolve(false);
        }, FAVICON_CONFIG.loadTimeout);

        img.onload = () => {
            clearTimeout(timeout);
            resolve(true);
        };

        img.onerror = () => {
            clearTimeout(timeout);
            resolve(false);
        };

        img.src = url;
    });
}

// 提取域名
function extractDomain(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

// 渲染图标
function renderIcon(iconData, size = 'default') {
    const sizeClass = size === 'small' ? 'icon-small' : 'icon-default';

    if (typeof iconData === 'string' &&
        (iconData.startsWith('http') || iconData.startsWith('//'))) {
        return `
            <img src="${iconData}"
                 class="site-favicon ${sizeClass}"
                 alt="favicon"
                 loading="lazy"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';"
                 onload="this.style.display='inline-block'; this.nextElementSibling.style.display='none';">
            <span class="site-emoji ${sizeClass}" style="display:none;">🌐</span>
        `;
    }

    return `<span class="site-emoji ${sizeClass}">${iconData || '🌐'}</span>`;
}

// 预加载关键资源
async function preloadCriticalResources() {
    // 预加载首屏图标
    const visibleSites = sitesData.slice(0, 8);
    const iconPromises = visibleSites.map(async (site) => {
        if (site.icon && !site.icon.match(/^[🔍-🦴]$/)) { // 不是 emoji
            const icon = await getFavicon(site.url, site.icon);
            if (icon !== site.icon) {
                updateRenderedIcon(site.url, icon);
            }
        }
    });

    await Promise.allSettled(iconPromises);
}

// 更新已渲染的图标
function updateRenderedIcon(url, newIcon) {
    const cards = document.querySelectorAll(`[href="${url}"]`);
    cards.forEach(card => {
        const iconContainer = card.querySelector('.card-icon, .quick-icon');
        if (iconContainer) {
            iconContainer.innerHTML = renderIcon(newIcon);
        }
    });
}

// 初始化 Service Worker
async function initServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker 注册成功');
        } catch (error) {
            console.warn('Service Worker 注册失败:', error);
        }
    }
}

// 渲染快速访问
function renderQuickSites(quickSites) {
    if (!quickSites || !quickSites.length) return;

    const quickSitesHtml = quickSites.map((site) => {
        const iconData = site.icon || '🌐';
        return `
            <a href="${site.url}" class="quick-item" target="_blank" rel="noopener noreferrer">
                <div class="quick-icon">${renderIcon(iconData, 'default')}</div>
                <span class="quick-title">${site.name}</span>
            </a>
        `;
    }).join('');

    elements.quickSites.innerHTML = quickSitesHtml;
}

// 事件监听器初始化
function initEventListeners() {
    // 搜索功能
    elements.searchInput.addEventListener('input', debounce(handleSearch, 300));
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // 分类过滤
    elements.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => handleCategoryFilter(btn));
    });

    // 页脚分类链接
    elements.footerLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = link.getAttribute('data-category');
            setActiveCategory(category);
        });
    });

    // 滚动优化
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                handleNavScroll();
                ticking = false;
            });
            ticking = true;
        }
    });

    // 键盘快捷键
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// 搜索处理
function handleSearch() {
    const newQuery = elements.searchInput.value.trim().toLowerCase();
    if (newQuery === searchQuery) return;

    searchQuery = newQuery;
    renderContent();
}

// 分类过滤处理
function handleCategoryFilter(clickedBtn) {
    const category = clickedBtn.getAttribute('data-category');
    setActiveCategory(category);
}

// 设置活跃分类
function setActiveCategory(category) {
    if (currentCategory === category) return;

    currentCategory = category;

    elements.filterBtns.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-category') === category);
    });

    elements.searchInput.value = '';
    searchQuery = '';

    renderContent();
}

// 渲染内容
function renderContent() {
    const filteredSites = filterSites();
    const categorizedSites = categorizeSites(filteredSites);

    if (Object.keys(categorizedSites).length === 0) {
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
        return;
    }

    renderCategories(categorizedSites);
}

// 渲染分类
function renderCategories(categorizedSites) {
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

// 过滤网站
function filterSites() {
    return sitesData.filter(site => {
        const matchesCategory = currentCategory === 'all' || site.category === currentCategory;
        const matchesSearch = !searchQuery ||
            site.name.toLowerCase().includes(searchQuery) ||
            site.description.toLowerCase().includes(searchQuery);

        return matchesCategory && matchesSearch;
    });
}

// 按分类组织网站
function categorizeSites(sites) {
    const categories = {};

    sites.forEach(site => {
        if (!categories[site.category]) {
            categories[site.category] = [];
        }
        categories[site.category].push(site);
    });

    return categories;
}

// 渲染分类部分
function renderCategorySection(category, sites) {
    const categoryInfo = getCategoryInfo(category);

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
                ${sites.map(site => renderSiteCard(site)).join('')}
            </div>
        </section>
    `;
}

// 渲染网站卡片
function renderSiteCard(site) {
    const highlightedName = highlightSearchTerm(site.name);
    const highlightedDesc = highlightSearchTerm(site.description);
    const iconData = site.icon || '🌐';

    return `
        <a href="${site.url}" class="category-card" target="_blank" rel="noopener noreferrer"
           data-site-id="${site.id}">
            <div class="card-icon">${renderIcon(iconData)}</div>
            <div class="card-content">
                <h3 class="card-title">${highlightedName}</h3>
                <p class="card-desc">${highlightedDesc}</p>
            </div>
        </a>
    `;
}

// 高亮搜索词
function highlightSearchTerm(text) {
    if (!searchQuery) return text;

    const regex = new RegExp(`(${escapeRegExp(searchQuery)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// 转义正则表达式
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 获取分类信息
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

    return categoryMap[category] || { name: category, icon: '🌐', description: '' };
}

// 导航滚动效果
function handleNavScroll() {
    const nav = document.querySelector('.nav-header');
    const categoryFilter = document.querySelector('.category-filter');

    if (!nav || !categoryFilter) return;

    const scrollY = window.scrollY;

    // 导航栏背景效果
    if (scrollY > 10) {
        nav.style.background = 'rgba(255, 255, 255, 0.95)';
        nav.style.backdropFilter = 'blur(20px)';
        nav.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.08)';
    } else {
        nav.style.background = 'rgba(255, 255, 255, 0.8)';
        nav.style.backdropFilter = 'blur(10px)';
        nav.style.boxShadow = 'none';
    }
}

// 键盘快捷键
function handleKeyboardShortcuts(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        elements.searchInput.focus();
        elements.searchInput.select();
    }

    if (e.key === 'Escape') {
        if (elements.searchInput.value) {
            elements.searchInput.value = '';
            handleSearch();
        }
    }
}

// 本地数据（作为最后备用方案）
function loadLocalData() {
    sitesData = [
        {
            id: 1,
            name: "Google",
            description: "全球最大的搜索引擎",
            url: "https://www.google.com",
            icon: "🔍",
            category: "others"
        },
        {
            id: 2,
            name: "GitHub",
            description: "开发者代码托管平台",
            url: "https://github.com",
            icon: "👨‍💻",
            category: "others"
        },
        {
            id: 3,
            name: "ChatGPT",
            description: "AI智能对话助手",
            url: "https://chat.openai.com",
            icon: "🤖",
            category: "ai"
        }
    ];

    const quickSites = [
        { name: "Google", icon: "🔍", url: "https://www.google.com" },
        { name: "GitHub", icon: "👨‍💻", url: "https://github.com" },
        { name: "ChatGPT", icon: "🤖", url: "https://chat.openai.com" }
    ];

    renderQuickSites(quickSites);
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
        elements.loading.style.display = 'flex';
    }
}

function hideLoading() {
    if (elements.loading) {
        elements.loading.style.display = 'none';
    }
}

function showError(message) {
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

// 性能监控
console.log('Cloudflare 优化版导航脚本加载完成');

// 启用 Cloudflare 的自动优化功能
const CloudflareOptimization = {
    // 在 Cloudflare Dashboard 中启用：
    // - Auto Minify (JS, CSS, HTML)
    // - Brotli Compression
    // - Polish (图片优化)
    // - Mirage (图片懒加载)

    // 代码中的优化
    enableImageOptimization: () => {
        // 使用 Cloudflare Images 或 Polish
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (img.src.includes('favicon')) {
                // 对 favicon 使用 Cloudflare 的图片优化
                img.src = `/cdn-cgi/image/width=32,height=32,format=auto/${img.src}`;
            }
        });
    }
};
