// 全局变量
let sitesData = [];
let currentCategory = 'all';
let searchQuery = '';

// 性能优化：图标缓存
const iconCache = new Map();
const imageValidationCache = new Map();

// GitHub 数据源配置
const DATA_CONFIG = {
    sitesUrl: 'https://raw.githubusercontent.com/laosji/newnav/main/sites.json',
    quickSitesUrl: 'https://raw.githubusercontent.com/laosji/newnav/main/quick-sites.json'
};

// 优化后的Favicon配置 - 减少网络请求
const FAVICON_CONFIG = {
    enabled: true,
    preferJsonIcon: true, // 优先使用JSON中的图标，减少网络请求
    service: 'google',
    services: {
        google: {
            url: (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
            fallback: true
        }
    },
    cacheExpire: 24 * 60 * 60 * 1000,
    loadTimeout: 3000, // 减少超时时间
    maxConcurrent: 3  // 限制并发数量
};

// 优化后的Favicon缓存管理
const faviconCache = {
    get(url) {
        const key = `favicon_${this.getDomain(url)}`;
        const cached = iconCache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > FAVICON_CONFIG.cacheExpire) {
            iconCache.delete(key);
            return null;
        }
        
        return cached.data;
    },
    
    set(url, data) {
        const key = `favicon_${this.getDomain(url)}`;
        iconCache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    },
    
    getDomain(url) {
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        } catch {
            return url;
        }
    }
};

// 优化的JSON数据图标查找器
const JsonIconFinder = {
    findIconInData(targetUrl, database = sitesData) {
        try {
            const targetDomain = this.extractDomain(targetUrl);
            if (!targetDomain) return null;
            
            // 使用Map进行快速查找（如果数据量大的话）
            const match = database.find(item => {
                if (!item.url) return false;
                const itemDomain = this.extractDomain(item.url);
                return itemDomain === targetDomain || 
                       targetDomain.includes(itemDomain) || 
                       itemDomain.includes(targetDomain);
            });
            
            return match ? (match.icon || null) : null;
        } catch (error) {
            console.warn('JSON数据查找失败:', error);
            return null;
        }
    },
    
    extractDomain(url) {
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        } catch {
            return '';
        }
    },
    
    isIconUrl(icon) {
        return typeof icon === 'string' && 
               (icon.startsWith('http') || icon.startsWith('//') || icon.startsWith('/'));
    }
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

// 初始化 - 优化加载流程
document.addEventListener('DOMContentLoaded', async () => {
    try {
        showLoading();
        
        // 1. 优先加载基础数据
        await loadBasicData();
        
        // 2. 立即渲染基础内容
        initEventListeners();
        renderContent();
        hideLoading();
        
        // 3. 异步加载图标（不阻塞主要内容显示）
        requestIdleCallback(() => {
            preloadCriticalFavicons();
        });
        
        // 4. 添加渐入动画
        setTimeout(() => {
            document.querySelectorAll('.category-section').forEach((section, index) => {
                setTimeout(() => {
                    section.classList.add('visible');
                }, index * 50); // 减少动画间隔
            });
        }, 100);
        
    } catch (error) {
        console.error('初始化失败:', error);
        showError('加载失败，请刷新页面重试');
        hideLoading();
    }
});

// 优化的favicon获取函数 - 减少阻塞
async function getFavicon(url, fallbackIcon = '🌐') {
    if (!FAVICON_CONFIG.enabled) {
        return fallbackIcon || '🌐';
    }
    
    // 如果fallback已经是有效URL，直接返回
    if (fallbackIcon && typeof fallbackIcon === 'string' && 
        (fallbackIcon.startsWith('http') || fallbackIcon.startsWith('//') || fallbackIcon.startsWith('/'))) {
        return fallbackIcon;
    }
    
    // 检查缓存
    const cached = faviconCache.get(url);
    if (cached) {
        return cached;
    }
    
    try {
        // 1. 优先使用JSON数据中的图标
        const jsonIcon = JsonIconFinder.findIconInData(url);
        if (jsonIcon) {
            if (JsonIconFinder.isIconUrl(jsonIcon)) {
                // 异步验证但不等待，直接返回
                validateImageAsync(jsonIcon).then(isValid => {
                    if (!isValid) {
                        faviconCache.set(url, fallbackIcon || '🌐');
                    }
                });
                faviconCache.set(url, jsonIcon);
                return jsonIcon;
            } else {
                faviconCache.set(url, jsonIcon);
                return jsonIcon;
            }
        }
        
        // 2. 如果没有JSON图标，使用默认图标，异步获取真实favicon
        const finalFallback = fallbackIcon || '🌐';
        faviconCache.set(url, finalFallback);
        
        // 异步获取真实favicon，不阻塞渲染
        requestIdleCallback(() => {
            tryGetExternalFavicon(url).then(iconResult => {
                if (iconResult) {
                    faviconCache.set(url, iconResult);
                    // 如果当前页面还显示这个网站，更新图标
                    updateRenderedIcon(url, iconResult);
                }
            });
        });
        
        return finalFallback;
        
    } catch (error) {
        console.warn(`获取 ${url} 的favicon失败:`, error);
        const finalFallback = fallbackIcon || '🌐';
        faviconCache.set(url, finalFallback);
        return finalFallback;
    }
}

// 异步图片验证（不阻塞主流程）
function validateImageAsync(url) {
    // 检查验证缓存
    if (imageValidationCache.has(url)) {
        return Promise.resolve(imageValidationCache.get(url));
    }
    
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            imageValidationCache.set(url, true);
            resolve(true);
        };
        img.onerror = () => {
            imageValidationCache.set(url, false);
            resolve(false);
        };
        img.src = url;
        
        setTimeout(() => {
            imageValidationCache.set(url, false);
            resolve(false);
        }, FAVICON_CONFIG.loadTimeout);
    });
}

// 尝试从外部服务获取favicon
async function tryGetExternalFavicon(url) {
    try {
        const domain = faviconCache.getDomain(url);
        const service = FAVICON_CONFIG.services[FAVICON_CONFIG.service];
        const iconUrl = service.url(domain);
        
        const isValid = await validateImageAsync(iconUrl);
        if (isValid) {
            return iconUrl;
        }
        
        return null;
    } catch (error) {
        return null;
    }
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

// 优化的图标渲染函数
function renderIcon(iconData, size = 'default') {
    const sizeClass = size === 'small' ? 'icon-small' : 'icon-default';
    
    if (typeof iconData === 'string' && (iconData.startsWith('http') || iconData.startsWith('//') || iconData.startsWith('/'))) {
        return `<img src="${iconData}" class="site-favicon ${sizeClass}" alt="favicon" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" 
                     onload="this.style.display='inline-block'; this.nextElementSibling.style.display='none';" 
                     loading="lazy">
                <span class="site-emoji ${sizeClass}" style="display:none;">🌐</span>`;
    }
    
    return `<span class="site-emoji ${sizeClass}">${iconData || '🌐'}</span>`;
}

// 优化的数据加载 - 分步加载
async function loadBasicData() {
    try {
        const [sitesResponse, quickSitesResponse] = await Promise.all([
            fetchWithRetry(DATA_CONFIG.sitesUrl),
            fetchWithRetry(DATA_CONFIG.quickSitesUrl)
        ]);
        
        if (!sitesResponse.ok || !quickSitesResponse.ok) {
            throw new Error('数据加载失败');
        }
        
        const [sites, quickSites] = await Promise.all([
            sitesResponse.json(),
            quickSitesResponse.json()
        ]);
        
        sitesData = sites;
        
        // 立即渲染快速访问（使用默认图标）
        renderQuickSites(quickSites);
        
    } catch (error) {
        console.error('数据加载错误:', error);
        loadMockData();
    }
}

// 关键图标预加载（仅加载可见内容的图标）
async function preloadCriticalFavicons() {
    // 只预加载首屏可见的网站图标
    const visibleSites = sitesData.slice(0, 12); // 假设首屏显示12个
    
    const semaphore = new Semaphore(FAVICON_CONFIG.maxConcurrent);
    
    const promises = visibleSites.map(site => 
        semaphore.acquire().then(async (release) => {
            try {
                const icon = await getFavicon(site.url, site.icon);
                if (icon !== site.icon) {
                    updateRenderedIcon(site.url, icon);
                }
            } finally {
                release();
            }
        })
    );
    
    await Promise.allSettled(promises);
}

// 信号量实现（控制并发数）
class Semaphore {
    constructor(max) {
        this.max = max;
        this.current = 0;
        this.queue = [];
    }
    
    acquire() {
        return new Promise((resolve) => {
            if (this.current < this.max) {
                this.current++;
                resolve(() => this.release());
            } else {
                this.queue.push(resolve);
            }
        });
    }
    
    release() {
        this.current--;
        if (this.queue.length > 0) {
            this.current++;
            const resolve = this.queue.shift();
            resolve(() => this.release());
        }
    }
}

// 优化的fetch函数
async function fetchWithRetry(url, retries = 2) { // 减少重试次数
    for (let i = 0; i < retries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
            
            const response = await fetch(url, { 
                signal: controller.signal,
                cache: 'force-cache' // 使用缓存
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) return response;
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 500 * (i + 1))); // 减少等待时间
        }
    }
}

// 默认数据（保持不变）
function loadMockData() {
    sitesData = [
        {
            id: 1,
            name: "Google",
            description: "全球最大的搜索引擎",
            url: "https://www.google.com",
            icon: "🔍",
            category: "productivity"
        },
        {
            id: 2,
            name: "GitHub",
            description: "开发者代码托管平台",
            url: "https://github.com",
            icon: "👨‍💻",
            category: "development"
        },
        {
            id: 3,
            name: "ChatGPT",
            description: "AI智能对话助手",
            url: "https://chat.openai.com",
            icon: "🤖",
            category: "ai"
        },
        {
            id: 4,
            name: "Figma",
            description: "在线协作设计工具",
            url: "https://www.figma.com",
            icon: "🎨",
            category: "design"
        },
        {
            id: 5,
            name: "YouTube",
            description: "全球最大视频分享平台",
            url: "https://www.youtube.com",
            icon: "📺",
            category: "entertainment"
        },
        {
            id: 6,
            name: "Amazon",
            description: "全球电商购物平台",
            url: "https://www.amazon.com",
            icon: "🛒",
            category: "shopping"
        },
        {
            id: 58,
            name: "OSL",
            description: "香港首家获得数字资产交易所牌照的交易所",
            url: "https://trade-hk.osl.com/invite/activities?invitationCode=ycYoX",
            icon: "https://www.osl.com/favicon.ico",
            category: "securities"
        }
    ];
    
    const quickSites = [
        { name: "Google", icon: "🔍", url: "https://www.google.com" },
        { name: "GitHub", icon: "👨‍💻", url: "https://github.com" },
        { name: "ChatGPT", icon: "🤖", url: "https://chat.openai.com" },
        { name: "Figma", icon: "🎨", url: "https://www.figma.com" },
        { name: "YouTube", icon: "📺", url: "https://www.youtube.com" },
        { name: "OSL", icon: "https://www.osl.com/favicon.ico", url: "https://trade-hk.osl.com" }
    ];
    
    renderQuickSites(quickSites);
}

// 优化的事件监听器初始化
function initEventListeners() {
    // 搜索功能（增加防抖时间）
    elements.searchInput.addEventListener('input', debounce(handleSearch, 500));
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
    
    // 优化的滚动监听
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
    
    // 窗口resize优化
    window.addEventListener('resize', debounce(() => {
        const categoryFilter = document.querySelector('.category-filter');
        const placeholder = document.querySelector('.filter-placeholder');
        if (placeholder) placeholder.remove();
        if (categoryFilter.classList.contains('sticky')) {
            categoryFilter.classList.remove('sticky');
            categoryFilter.style.cssText = '';
        }
        setTimeout(handleNavScroll, 100);
    }, 300));
    
    // 键盘快捷键
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// 搜索处理（优化版）
function handleSearch() {
    const newQuery = elements.searchInput.value.trim().toLowerCase();
    if (newQuery === searchQuery) return; // 避免重复渲染
    
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
    if (currentCategory === category) return; // 避免重复渲染
    
    currentCategory = category;
    
    elements.filterBtns.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-category') === category);
    });
    
    elements.searchInput.value = '';
    searchQuery = '';
    
    renderContent();
}

// 渲染快速访问（同步版本，使用默认图标）
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
    
    // 异步更新图标
    requestIdleCallback(() => {
        quickSites.forEach(async (site) => {
            if (!site.icon || site.icon === '🌐') {
                const icon = await getFavicon(site.url, site.icon);
                if (icon !== (site.icon || '🌐')) {
                    updateRenderedIcon(site.url, icon);
                }
            }
        });
    });
}

// 优化的内容渲染
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
    
    // 同步渲染（先显示默认图标）
    renderCategoriesSync(categorizedSites);
    
    // 异步更新图标
    requestIdleCallback(() => {
        updateCategoryIcons(categorizedSites);
    });
}

// 同步渲染分类内容
function renderCategoriesSync(categorizedSites) {
    const categoryHtmls = Object.entries(categorizedSites).map(([category, sites]) =>
        renderCategorySection(category, sites)
    );
    
    elements.categoriesContainer.innerHTML = categoryHtmls.join('');
    
    // 添加渐入动画
    setTimeout(() => {
        document.querySelectorAll('.category-section').forEach((section, index) => {
            setTimeout(() => {
                section.classList.add('visible');
            }, index * 30); // 进一步减少动画间隔
        });
    }, 50);
}

// 异步更新分类图标
async function updateCategoryIcons(categorizedSites) {
    const allSites = Object.values(categorizedSites).flat();
    const semaphore = new Semaphore(FAVICON_CONFIG.maxConcurrent);
    
    const promises = allSites.map(site => 
        semaphore.acquire().then(async (release) => {
            try {
                if (!site.icon || site.icon === '🌐') {
                    const icon = await getFavicon(site.url, site.icon);
                    if (icon !== (site.icon || '🌐')) {
                        updateRenderedIcon(site.url, icon);
                    }
                }
            } finally {
                release();
            }
        })
    );
    
    await Promise.allSettled(promises);
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

// 渲染分类部分（同步版本）
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

// 渲染网站卡片（同步版本）
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

// 转义正则表达式特殊字符
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 获取分类信息
function getCategoryInfo(category) {
    const categoryMap = {
        productivity: { name: '办公效率', icon: '⚡', description: '提升工作效率的优质工具' },
        ai: { name: 'AI 工具', icon: '🤖', description: '人工智能驱动的创新应用' },
        normal: { name: '常用', icon: '🕙', description: '常用工具' },
        development: { name: '开发工具', icon: '⚙️', description: '开发者必备的专业工具' },
        design: { name: '设计创意', icon: '🎨', description: '激发创意的设计平台' },
        social: { name: '社交媒体', icon: '💬', description: '连接世界的社交网络' },
        entertainment: { name: '娱乐休闲', icon: '🎵', description: '精彩纷呈的娱乐内容' },
        shopping: { name: '购物商城', icon: '🛍️', description: '优质可靠的购物平台' },
        education: { name: '学习教育', icon: '📚', description: '知识学习的最佳选择' },
        overseas_bank: { name: '境外银行账户', icon: '🏦', description: '境外银行开户与账户管理服务' },
        securities: { name: '港美股券商', icon: '📈', description: '港美股投资交易平台' },
        overseas_sim: { name: '境外手机卡', icon: '📱', description: '境外手机卡与通信服务' },
        others: { name: '其他', icon: '📦', description: '其他实用工具与服务' }
    };
    
    return categoryMap[category] || { name: category, icon: '🌐', description: '' };
}

// 优化的导航滚动效果
function handleNavScroll() {
    const nav = document.querySelector('.nav-header');
    const categoryFilter = document.querySelector('.category-filter');
    const quickAccess = document.querySelector('.quick-access');
    
    if (!nav || !categoryFilter || !quickAccess) return;
    
    const navHeight = nav.offsetHeight;
    const quickAccessBottom = quickAccess.offsetTop + quickAccess.offsetHeight;
    const scrollY = window.scrollY;
    
    // 导航栏背景效果
    if (scrollY > 10) {
        nav.style.background = 'rgba(255, 255, 255, 0.95)';
        nav.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.08)';
    } else {
        nav.style.background = 'rgba(255, 255, 255, 0.8)';
        nav.style.boxShadow = 'none';
    }
    
    // 分类过滤器吸附效果
    if (scrollY > quickAccessBottom - navHeight) {
        if (!categoryFilter.classList.contains('sticky')) {
            categoryFilter.style.position = 'fixed';
            categoryFilter.style.top = navHeight + 'px';
            categoryFilter.style.left = '0';
            categoryFilter.style.right = '0';
            categoryFilter.style.zIndex = '99';
            categoryFilter.style.background = 'rgba(251, 251, 253, 0.95)';
            categoryFilter.style.backdropFilter = 'blur(20px)';
            categoryFilter.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.08)';
            categoryFilter.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            categoryFilter.classList.add('sticky');
            
            if (!document.querySelector('.filter-placeholder')) {
                const placeholder = document.createElement('div');
                placeholder.className = 'filter-placeholder';
                placeholder.style.height = categoryFilter.offsetHeight + 'px';
                categoryFilter.parentNode.insertBefore(placeholder, categoryFilter);
            }
        }
    } else {
        if (categoryFilter.classList.contains('sticky')) {
            categoryFilter.style.cssText = '';
            categoryFilter.classList.remove('sticky');
            
            const placeholder = document.querySelector('.filter-placeholder');
            if (placeholder) {
                placeholder.remove();
            }
        }
    }
}

// 键盘快捷键处理
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
    
    if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        const filterBtns = document.querySelectorAll('.filter-btn');
        if (filterBtns[index]) {
            filterBtns[index].click();
        }
    }
}

// 工具函数：防抖
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

// 显示加载状态
function showLoading() {
    if (elements.loading) {
        elements.loading.style.display = 'flex';
    }
}

// 隐藏加载状态
function hideLoading() {
    if (elements.loading) {
        elements.loading.style.display = 'none';
    }
}

// 显示错误信息
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
        animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.style.animation = 'slideOutRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 300);
    }, 5000);
}

// 平滑滚动到元素
function smoothScrollTo(element) {
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// 获取当前时间问候语
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 6) return '夜深了';
    if (hour < 9) return '早上好';
    if (hour < 12) return '上午好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    if (hour < 22) return '晚上好';
    return '夜晚好';
}

// 格式化数字（添加千分位分隔符）
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 检测设备类型
function isMobile() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 检测深色模式偏好
function prefersDarkMode() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// 复制文本到剪贴板
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // 降级处理
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            return true;
        } catch (err) {
            return false;
        } finally {
            document.body.removeChild(textArea);
        }
    }
}

// 生成随机ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 验证URL格式
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// 提取域名
function extractDomain(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch (_) {
        return '';
    }
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 获取随机颜色
function getRandomColor() {
    const colors = [
        '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
        '#dda0dd', '#98d8c8', '#f7dc6f', '#bb8fce', '#85c1e9'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 深拷贝对象
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

// 存储管理（使用内存存储，因为不能使用localStorage）
const storage = {
    data: new Map(),
    
    set(key, value) {
        try {
            this.data.set(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('存储失败:', error);
            return false;
        }
    },
    
    get(key) {
        try {
            const value = this.data.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error('读取失败:', error);
            return null;
        }
    },
    
    remove(key) {
        return this.data.delete(key);
    },
    
    clear() {
        this.data.clear();
    },
    
    has(key) {
        return this.data.has(key);
    }
};

// 性能监控
const performance = {
    marks: new Map(),
    
    mark(name) {
        this.marks.set(name, Date.now());
    },
    
    measure(name, startMark) {
        const start = this.marks.get(startMark);
        if (start) {
            const duration = Date.now() - start;
            console.log(`${name}: ${duration}ms`);
            return duration;
        }
        return 0;
    }
};

// 初始化性能监控
performance.mark('init-start');

// 错误处理
window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', event.reason);
});

// 页面可见性变化处理
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('页面隐藏');
    } else {
        console.log('页面显示');
    }
});

// 网络状态监听
window.addEventListener('online', () => {
    console.log('网络已连接');
});

window.addEventListener('offline', () => {
    console.log('网络已断开');
    showError('网络连接已断开，部分功能可能无法正常使用');
});

// 导出主要函数供外部使用
window.NavigationSite = {
    // 数据相关
    getSitesData: () => sitesData,
    setSitesData: (data) => { sitesData = data; renderContent(); },
    
    // 搜索相关
    search: (query) => {
        elements.searchInput.value = query;
        handleSearch();
    },
    
    // 分类相关
    setCategory: (category) => setActiveCategory(category),
    getCurrentCategory: () => currentCategory,
    
    // 工具函数
    utils: {
        debounce,
        throttle,
        deepClone,
        formatNumber,
        formatFileSize,
        copyToClipboard,
        isValidUrl,
        extractDomain,
        getRandomColor,
        isMobile,
        prefersDarkMode
    },
    
    // 存储
    storage,
    
    // 性能监控
    performance
};

console.log('导航网站脚本加载完成');
