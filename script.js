// 全局变量
let sitesData = [];
let currentCategory = 'all';
let searchQuery = '';

// GitHub 数据源配置
const DATA_CONFIG = {
    // 替换为你的GitHub数据源URL
    // 格式: https://raw.githubusercontent.com/用户名/仓库名/分支名/文件名

    sitesUrl: 'https://raw.githubusercontent.com/laosji/newnav/main/sites.json',
    quickSitesUrl: 'https://raw.githubusercontent.com/laosji/newnav/main/quick-sites.json'
};

// Favicon 相关配置
const FAVICON_CONFIG = {
    // 是否启用favicon功能
    enabled: true,
    // 是否优先使用JSON数据中的icon
    preferJsonIcon: false,
    // favicon服务提供商
    service: 'google', // 'google', 'favicongrabber', 'iconhorse'
    // 服务商API配置
    services: {
        google: {
            url: (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
            fallback: true
        },
        favicongrabber: {
            url: (domain) => `https://favicongrabber.com/api/grab/${domain}`,
            fallback: true
        },
        iconhorse: {
            url: (domain) => `https://icon.horse/icon/${domain}`,
            fallback: true
        }
    },
    // 缓存过期时间（毫秒）
    cacheExpire: 24 * 60 * 60 * 1000, // 24小时
    // 加载超时时间
    loadTimeout: 5000
};

// Favicon 缓存管理
const faviconCache = {
    // 从内存中获取缓存
    get(url) {
        const key = `favicon_${this.getDomain(url)}`;
        const cached = this.memoryCache.get(key);
        if (!cached) return null;
        
        // 检查是否过期
        if (Date.now() - cached.timestamp > FAVICON_CONFIG.cacheExpire) {
            this.memoryCache.delete(key);
            return null;
        }
        
        return cached.data;
    },
    
    // 设置缓存
    set(url, data) {
        const key = `favicon_${this.getDomain(url)}`;
        this.memoryCache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    },
    
    // 内存缓存存储
    memoryCache: new Map(),
    
    // 提取域名
    getDomain(url) {
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        } catch {
            return url;
        }
    }
};

// JSON数据图标查找器
const JsonIconFinder = {
    // 从JSON数据中查找匹配的icon
    findIconInData(targetUrl, database = sitesData) {
        try {
            const targetDomain = this.extractDomain(targetUrl);
            if (!targetDomain) return null;
            
            // 查找匹配的记录
            const match = database.find(item => {
                if (!item.url) return false;
                
                const itemDomain = this.extractDomain(item.url);
                // 支持精确匹配和子域名匹配
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
    
    // 提取域名
    extractDomain(url) {
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        } catch {
            return '';
        }
    },
    
    // 验证icon是否为URL格式
    isIconUrl(icon) {
        return typeof icon === 'string' && 
               (icon.startsWith('http') || icon.startsWith('//') || icon.startsWith('/'));
    }
};

// DOM 元素
const elements = {
    loading: document.getElementById('loading'),
    searchInput: document.querySelector('.search-input'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    quickSites: document.getElementById('quick-sites'),
    categoriesContainer: document.getElementById('categories-container'),
    navLinks: document.querySelectorAll('.nav-link'),
    footerLinks: document.querySelectorAll('.footer-section a[data-category]')
};

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        showLoading();
        await loadData();
        initEventListeners();
        renderContent();
        hideLoading();
        
        // 添加渐入动画
        setTimeout(() => {
            document.querySelectorAll('.category-section').forEach((section, index) => {
                setTimeout(() => {
                    section.classList.add('visible');
                }, index * 100);
            });
        }, 300);
        
    } catch (error) {
        console.error('初始化失败:', error);
        showError('加载失败，请刷新页面重试');
        hideLoading();
    }
});

// 增强的获取网站Favicon函数
async function getFavicon(url, fallbackIcon = '🌐') {
    if (!FAVICON_CONFIG.enabled) {
        return fallbackIcon || '🌐';
    }
    
    // 如果fallbackIcon已经是一个有效的URL图标，直接返回
    if (fallbackIcon && typeof fallbackIcon === 'string' && 
        (fallbackIcon.startsWith('http') || fallbackIcon.startsWith('//') || fallbackIcon.startsWith('/'))) {
        return fallbackIcon;
    }
    
    // 先从缓存获取
    const cached = faviconCache.get(url);
    if (cached) {
        return cached;
    }
    
    try {
        let iconResult = null;
        
        // 1. 如果配置优先使用JSON数据，先从JSON查找
        if (FAVICON_CONFIG.preferJsonIcon) {
            iconResult = await tryGetJsonIcon(url);
            if (iconResult) {
                faviconCache.set(url, iconResult);
                return iconResult;
            }
        }
        
        // 2. 尝试从外部服务获取favicon
        iconResult = await tryGetExternalFavicon(url);
        if (iconResult) {
            faviconCache.set(url, iconResult);
            return iconResult;
        }
        
        // 3. 如果还没有配置优先使用JSON，现在从JSON查找
        if (!FAVICON_CONFIG.preferJsonIcon) {
            iconResult = await tryGetJsonIcon(url);
            if (iconResult) {
                faviconCache.set(url, iconResult);
                return iconResult;
            }
        }
        
        // 4. 都失败了，使用fallback图标
        console.log(`所有方法都失败，使用fallback图标: ${url}`);
        const finalFallback = fallbackIcon || '🌐';
        faviconCache.set(url, finalFallback);
        return finalFallback;
        
    } catch (error) {
        console.warn(`获取 ${url} 的favicon失败:`, error);
        
        // 错误时尝试从JSON获取
        const jsonIcon = await tryGetJsonIcon(url);
        if (jsonIcon) {
            faviconCache.set(url, jsonIcon);
            return jsonIcon;
        }
        
        const finalFallback = fallbackIcon || '🌐';
        faviconCache.set(url, finalFallback);
        return finalFallback;
    }
}

// 尝试从JSON数据获取图标
async function tryGetJsonIcon(url) {
    try {
        const jsonIcon = JsonIconFinder.findIconInData(url);
        if (!jsonIcon) return null;
        
        // 如果是URL格式的图标，验证其有效性
        if (JsonIconFinder.isIconUrl(jsonIcon)) {
            const isValid = await validateImage(jsonIcon);
            if (isValid) {
                console.log(`JSON图标获取成功: ${url} -> ${jsonIcon}`);
                return jsonIcon;
            } else {
                console.warn(`JSON图标无效: ${jsonIcon}`);
                return null;
            }
        }
        
        // 如果是emoji或其他格式，直接返回
        console.log(`JSON图标获取成功(emoji): ${url} -> ${jsonIcon}`);
        return jsonIcon;
        
    } catch (error) {
        console.warn('JSON图标获取失败:', error);
        return null;
    }
}

// 尝试从外部服务获取favicon
async function tryGetExternalFavicon(url) {
    try {
        const domain = faviconCache.getDomain(url);
        const service = FAVICON_CONFIG.services[FAVICON_CONFIG.service];
        
        if (FAVICON_CONFIG.service === 'favicongrabber') {
            // FaviconGrabber API 返回JSON
            const response = await fetchWithTimeout(service.url(domain), FAVICON_CONFIG.loadTimeout);
            const data = await response.json();
            
            if (data.icons && data.icons.length > 0) {
                const iconUrl = data.icons[0].src;
                const isValid = await validateImage(iconUrl);
                if (isValid) {
                    console.log(`外部服务图标获取成功: ${url} -> ${iconUrl}`);
                    return iconUrl;
                }
            }
        } else {
            // 直接返回图片URL
            const iconUrl = service.url(domain);
            
            // 预加载图片检查是否有效
            const isValid = await validateImage(iconUrl);
            if (isValid) {
                console.log(`外部服务图标获取成功: ${url} -> ${iconUrl}`);
                return iconUrl;
            }
        }
        
        return null;
        
    } catch (error) {
        console.warn('外部服务获取失败:', error);
        return null;
    }
}

// 验证图片是否有效
function validateImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
        
        // 设置超时
        setTimeout(() => resolve(false), FAVICON_CONFIG.loadTimeout);
    });
}

// 带超时的fetch
function fetchWithTimeout(url, timeout = 5000) {
    return Promise.race([
        fetch(url),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeout)
        )
    ]);
}

// 渲染图标（支持emoji和favicon）
function renderIcon(iconData, size = 'default') {
    const sizeClass = size === 'small' ? 'icon-small' : 'icon-default';
    
    // 如果是URL，渲染为img标签
    if (typeof iconData === 'string' && (iconData.startsWith('http') || iconData.startsWith('//') || iconData.startsWith('/'))) {
        return `<img src="${iconData}" class="site-favicon ${sizeClass}" alt="favicon" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" 
                     onload="this.style.display='inline-block'; this.nextElementSibling.style.display='none';">
                <span class="site-emoji ${sizeClass}" style="display:none;">🌐</span>`;
    }
    
    // 否则渲染为emoji
    return `<span class="site-emoji ${sizeClass}">${iconData || '🌐'}</span>`;
}

// 加载数据
async function loadData() {
    try {
        // 并行加载数据
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
        
        // 预加载favicon
        if (FAVICON_CONFIG.enabled) {
            await preloadFavicons([...sites, ...quickSites]);
        }
        
        renderQuickSites(quickSites);
        
    } catch (error) {
        console.error('数据加载错误:', error);
        // 使用模拟数据作为备用
        loadMockData();
    }
}

// 预加载favicon（批量处理，避免阻塞）
async function preloadFavicons(sites) {
    const batchSize = 5; // 每批处理5个
    const batches = [];
    
    for (let i = 0; i < sites.length; i += batchSize) {
        batches.push(sites.slice(i, i + batchSize));
    }
    
    // 分批处理，避免并发过多
    for (const batch of batches) {
        await Promise.allSettled(
            batch.map(site => getFavicon(site.url, site.icon))
        );
        
        // 每批之间稍作延迟
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

// 带重试的fetch
async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (response.ok) return response;
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

// 默认数据
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
        // 添加一个带URL图标的示例
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

// 初始化事件监听器
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
    
    // 导航滚动效果 (优化版，包含节流)
    let scrollTimer = null;
    window.addEventListener('scroll', () => {
        if (scrollTimer) return;
        scrollTimer = setTimeout(() => {
            handleNavScroll();
            scrollTimer = null;
        }, 10);
    });
    
    // 窗口resize时重新计算位置
    window.addEventListener('resize', debounce(() => {
        // 重置sticky状态，重新计算
        const categoryFilter = document.querySelector('.category-filter');
        const placeholder = document.querySelector('.filter-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        if (categoryFilter.classList.contains('sticky')) {
            categoryFilter.classList.remove('sticky');
            categoryFilter.style.cssText = '';
        }
        // 延迟重新计算，确保DOM更新完成
        setTimeout(handleNavScroll, 100);
    }, 250));
    
    // 键盘快捷键
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// 搜索处理
function handleSearch() {
    searchQuery = elements.searchInput.value.trim().toLowerCase();
    renderContent();
}

// 分类过滤处理
function handleCategoryFilter(clickedBtn) {
    const category = clickedBtn.getAttribute('data-category');
    setActiveCategory(category);
}

// 设置活跃分类
function setActiveCategory(category) {
    currentCategory = category;
    
    // 更新按钮状态
    elements.filterBtns.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-category') === category);
    });
    
    // 清空搜索
    elements.searchInput.value = '';
    searchQuery = '';
    
    renderContent();
}

// 渲染快速访问
async function renderQuickSites(quickSites) {
    if (!quickSites || !quickSites.length) return;
    
    const quickSitesHtml = await Promise.all(
        quickSites.map(async (site) => {
            // 优先使用JSON中的icon
            let iconData = site.icon;
            if (!iconData || iconData === '🌐') {
                iconData = await getFavicon(site.url, site.icon || '🌐');
            }
            
            return `
                <a href="${site.url}" class="quick-item" target="_blank" rel="noopener noreferrer">
                    <div class="quick-icon">${renderIcon(iconData, 'default')}</div>
                    <span class="quick-title">${site.name}</span>
                </a>
            `;
        })
    );
    
    elements.quickSites.innerHTML = quickSitesHtml.join('');
}

// 渲染主要内容
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
    
    // 异步渲染分类内容
    renderCategoriesAsync(categorizedSites);
}

// 异步渲染分类内容
async function renderCategoriesAsync(categorizedSites) {
    const categoryPromises = Object.entries(categorizedSites).map(([category, sites]) =>
        renderCategorySectionAsync(category, sites)
    );
    
    const categoryHtmls = await Promise.all(categoryPromises);
    elements.categoriesContainer.innerHTML = categoryHtmls.join('');
    
    // 添加渐入动画
    setTimeout(() => {
        document.querySelectorAll('.category-section').forEach((section, index) => {
            setTimeout(() => {
                section.classList.add('visible');
            }, index * 100);
        });
    }, 50);
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

// 异步渲染分类部分
async function renderCategorySectionAsync(category, sites) {
    const categoryInfo = getCategoryInfo(category);
    const siteCards = await Promise.all(sites.map(site => renderSiteCardAsync(site)));
    
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
                ${siteCards.join('')}
            </div>
        </section>
    `;
}

// 渲染分类部分（同步版本，保持兼容性）
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

// 异步渲染网站卡片
async function renderSiteCardAsync(site) {
    const highlightedName = highlightSearchTerm(site.name);
    const highlightedDesc = highlightSearchTerm(site.description);
    
    // 优先使用JSON中的icon，如果没有则获取favicon
    let iconData = site.icon;
    if (!iconData || iconData === '🌐') {
        iconData = await getFavicon(site.url, site.icon || '🌐');
    }
    
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

// 渲染网站卡片（同步版本，保持兼容性）
function renderSiteCard(site) {
    const highlightedName = highlightSearchTerm(site.name);
    const highlightedDesc = highlightSearchTerm(site.description);
    
    return `
        <a href="${site.url}" class="category-card" target="_blank" rel="noopener noreferrer" 
           data-site-id="${site.id}">
            <div class="card-icon">${renderIcon(site.icon)}</div>
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
        // 新增的分类
        overseas_bank: { name: '境外银行账户', icon: '🏦', description: '境外银行开户与账户管理服务' },
        securities: { name: '港美股券商', icon: '📈', description: '港美股投资交易平台' },
        overseas_sim: { name: '境外手机卡', icon: '📱', description: '境外手机卡与通信服务' },
        others: { name: '其他', icon: '📦', description: '其他实用工具与服务' }
    };
    
    return categoryMap[category] || { name: category, icon: '🌐', description: '' };
}

// 导航滚动效果
function handleNavScroll() {
    const nav = document.querySelector('.nav-header');
    const categoryFilter = document.querySelector('.category-filter');
    const quickAccess = document.querySelector('.quick-access');
    const navHeight = nav.offsetHeight;
    
    // 计算关键位置
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
    
    // 分类过滤器吸附效果 - 只在滚动超过快速访问区域后才吸附
    if (scrollY > quickAccessBottom - navHeight) {
        // 启用吸附效果
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
            
            // 添加占位元素避免内容跳跃
            if (!document.querySelector('.filter-placeholder')) {
                const placeholder = document.createElement('div');
                placeholder.className = 'filter-placeholder';
                placeholder.style.height = categoryFilter.offsetHeight + 'px';
                categoryFilter.parentNode.insertBefore(placeholder, categoryFilter);
            }
        }
    } else {
        // 移除吸附效果，回到正常位置
        if (categoryFilter.classList.contains('sticky')) {
            categoryFilter.style.cssText = '';
            categoryFilter.classList.remove('sticky');
            
            // 移除占位元素
            const placeholder = document.querySelector('.filter-placeholder');
            if (placeholder) {
                placeholder.remove();
            }
        }
    }
}

// 键盘快捷键处理
function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + K 快速搜索
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        elements.searchInput.focus();
        elements.searchInput.select();
    }
    
    // ESC 清空搜索
    if (e.key === 'Escape') {
        if (elements.searchInput.value) {
            elements.searchInput.value = '';
            handleSearch();
        }
    }
    
    // 数字键快速切换分类
    if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const index = parseInt(e.key) - 1;
        const filterButtons = Array.from(elements.filterBtns);
        if (filterButtons[index]) {
            filterButtons[index].click();
        }
    }
}

// 显示加载状态
function showLoading() {
    elements.loading.style.display = 'flex';
    elements.loading.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>正在加载数据...</p>
        </div>
    `;
}

// 隐藏加载状态
function hideLoading() {
    elements.loading.style.display = 'none';
}

// 显示错误信息
function showError(message) {
    elements.categoriesContainer.innerHTML = `
        <div class="error-message">
            <div class="error-content">
                <div class="error-icon">⚠️</div>
                <h3>加载失败</h3>
                <p>${message}</p>
                <button onclick="location.reload()" class="retry-btn">重新加载</button>
            </div>
        </div>
    `;
}

// 防抖函数
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
    }
}

// 工具函数：获取随机颜色
function getRandomColor() {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// 工具函数：格式化URL
function formatUrl(url) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return 'https://' + url;
    }
    return url;
}

// 工具函数：截取文本
function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }
    return text.slice(0, maxLength) + '...';
}

// 性能监控
const Performance = {
    marks: new Map(),
    
    mark(name) {
        this.marks.set(name, performance.now());
    },
    
    measure(name, startMark) {
        const startTime = this.marks.get(startMark);
        if (startTime) {
            const duration = performance.now() - startTime;
            console.log(`${name}: ${duration.toFixed(2)}ms`);
            return duration;
        }
    }
};

// 导出配置（如果需要在其他脚本中使用）
window.NavConfig = {
    DATA_CONFIG,
    FAVICON_CONFIG,
    getCategoryInfo,
    getFavicon,
    renderIcon
};

// 添加一些CSS样式补充
const additionalStyles = `
<style>
/* 加载动画样式 */
.loading-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #007AFF;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* 错误信息样式 */
.error-message {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 300px;
    padding: 2rem;
}

.error-content {
    text-align: center;
    max-width: 400px;
}

.error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.retry-btn {
    background: #007AFF;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    margin-top: 1rem;
    transition: background-color 0.2s;
}

.retry-btn:hover {
    background: #0056D6;
}

/* Favicon相关样式 */
.site-favicon {
    border-radius: 4px;
    object-fit: cover;
    display: inline-block;
    vertical-align: middle;
}

.icon-default {
    width: 24px;
    height: 24px;
    min-width: 24px;
    min-height: 24px;
}

.icon-small {
    width: 16px;
    height: 16px;
    min-width: 16px;
    min-height: 16px;
}

.site-emoji {
    display: inline-block;
    text-align: center;
    vertical-align: middle;
    line-height: 1;
}

.site-emoji.icon-default {
    font-size: 24px;
    width: 24px;
    height: 24px;
}

.site-emoji.icon-small {
    font-size: 16px;
    width: 16px;
    height: 16px;
}

/* 搜索高亮样式 */
mark {
    background-color: #FFE066;
    color: #333;
    padding: 0.1em 0.2em;
    border-radius: 3px;
}

/* 响应式优化 */
@media (max-width: 768px) {
    .category-filter.sticky {
        padding: 0.75rem 1rem;
    }
    
    .filter-placeholder {
        height: auto !important;
    }
}

/* 辅助功能改进 */
.category-card:focus {
    outline: 2px solid #007AFF;
    outline-offset: 2px;
}

.quick-item:focus {
    outline: 2px solid #007AFF;
    outline-offset: 2px;
}

/* 打印样式 */
@media print {
    .nav-header,
    .category-filter,
    .quick-access {
        display: none !important;
    }
    
    .category-card {
        break-inside: avoid;
        page-break-inside: avoid;
    }
}
</style>
`;

// 将额外样式添加到页面头部
if (!document.querySelector('#additional-nav-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'additional-nav-styles';
    styleElement.innerHTML = additionalStyles;
    document.head.appendChild(styleElement);
}
