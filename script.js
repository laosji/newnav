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
        renderQuickSites(quickSites);
        
    } catch (error) {
        console.error('数据加载错误:', error);
        // 使用模拟数据作为备用
        loadMockData();
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
        }
    ];
    
    const quickSites = [
        { name: "Google", icon: "🔍", url: "https://www.google.com" },
        { name: "GitHub", icon: "👨‍💻", url: "https://github.com" },
        { name: "ChatGPT", icon: "🤖", url: "https://chat.openai.com" },
        { name: "Figma", icon: "🎨", url: "https://www.figma.com" },
        { name: "YouTube", icon: "📺", url: "https://www.youtube.com" },
        { name: "Amazon", icon: "🛒", url: "https://www.amazon.com" }
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
function renderQuickSites(quickSites) {
    if (!quickSites || !quickSites.length) return;
    
    elements.quickSites.innerHTML = quickSites.map(site => `
        <a href="${site.url}" class="quick-item" target="_blank" rel="noopener noreferrer">
            <div class="quick-icon">${site.icon}</div>
            <span class="quick-title">${site.name}</span>
        </a>
    `).join('');
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
    
    elements.categoriesContainer.innerHTML = Object.entries(categorizedSites)
        .map(([category, sites]) => renderCategorySection(category, sites))
        .join('');
    
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
    
    return `
        <a href="${site.url}" class="category-card" target="_blank" rel="noopener noreferrer" 
           data-site-id="${site.id}">
            <div class="card-icon">${site.icon}</div>
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
            categoryFilter.style.position = '';
            categoryFilter.style.top = '';
            categoryFilter.style.left = '';
            categoryFilter.style.right = '';
            categoryFilter.style.zIndex = '';
            categoryFilter.style.background = '';
            categoryFilter.style.backdropFilter = '';
            categoryFilter.style.boxShadow = '';
            categoryFilter.style.transition = '';
            categoryFilter.classList.remove('sticky');
            
            // 移除占位元素
            const placeholder = document.querySelector('.filter-placeholder');
            if (placeholder) {
                placeholder.remove();
            }
        }
    }
}

// 键盘快捷键
function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + K 聚焦搜索框
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        elements.searchInput.focus();
    }
    
    // Escape 清空搜索
    if (e.key === 'Escape' && document.activeElement === elements.searchInput) {
        elements.searchInput.value = '';
        elements.searchInput.blur();
        searchQuery = '';
        renderContent();
    }
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

// 显示加载动画
function showLoading() {
    elements.loading.classList.remove('hidden');
}

// 隐藏加载动画
function hideLoading() {
    setTimeout(() => {
        elements.loading.classList.add('hidden');
    }, 500);
}

// 显示错误信息
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff3b30;
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        z-index: 1001;
        font-size: 14px;
        font-weight: 500;
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// 导出供外部使用
window.NavigationApp = {
    setCategory: setActiveCategory,
    search: (query) => {
        elements.searchInput.value = query;
        handleSearch();
    },
    refresh: () => {
        showLoading();
        loadData().then(() => {
            renderContent();
            hideLoading();
        });
    }
};
