// 导航页面交互脚本
class NavigationManager {
    constructor() {
        this.currentCategory = 'all';
        this.searchTerm = '';
        this.sitesData = this.getLocalData();
        this.init();
    }

    // 直接初始化，不使用异步加载
    init() {
        console.log('开始初始化导航页面');
        
        // 确保容器存在
        this.ensureAppContainer();
        
        // 直接渲染内容
        this.renderContent();
        
        // 设置事件监听器
        this.setupEventListeners();
        
        console.log('导航页面初始化完成');
    }

    // 确保 app 容器存在
    ensureAppContainer() {
        let app = document.getElementById('app');
        if (!app) {
            app = document.createElement('div');
            app.id = 'app';
            document.body.appendChild(app);
        }
    }

    // 本地数据
    getLocalData() {
        return {
            quickAccess: [
                { name: "微信", icon: "💬", url: "https://wx.qq.com", category: "social" },
                { name: "微博", icon: "🐦", url: "https://www.weibo.com", category: "social" },
                { name: "淘宝", icon: "🛍️", url: "https://www.taobao.com", category: "shopping" },
                { name: "京东", icon: "📦", url: "https://www.jd.com", category: "shopping" },
                { name: "网易云", icon: "🎵", url: "https://music.163.com", category: "entertainment" },
                { name: "百度网盘", icon: "☁️", url: "https://pan.baidu.com", category: "productivity" },
                { name: "GitHub", icon: "👨‍💻", url: "https://github.com", category: "development" },
                { name: "知乎", icon: "💭", url: "https://www.zhihu.com", category: "education" }
            ],
            categories: [
                {
                    id: "productivity",
                    name: "办公效率",
                    icon: "⚡",
                    description: "提升工作效率的必备工具",
                    sites: [
                        { name: "Notion", icon: "📝", url: "https://www.notion.so", description: "全能工作空间" },
                        { name: "Figma", icon: "🎨", url: "https://www.figma.com", description: "协作设计工具" },
                        { name: "Slack", icon: "💼", url: "https://slack.com", description: "团队沟通平台" },
                        { name: "Canva", icon: "🖼️", url: "https://www.canva.com", description: "在线设计平台" },
                        { name: "Trello", icon: "📋", url: "https://trello.com", description: "项目管理" },
                        { name: "Zoom", icon: "📹", url: "https://www.zoom.us", description: "视频会议" }
                    ]
                },
                {
                    id: "ai",
                    name: "AI 工具",
                    icon: "🤖",
                    description: "人工智能驱动的创新工具",
                    sites: [
                        { name: "ChatGPT", icon: "💬", url: "https://chat.openai.com", description: "AI对话助手" },
                        { name: "Midjourney", icon: "🎭", url: "https://midjourney.com", description: "AI艺术生成" },
                        { name: "Notion AI", icon: "✍️", url: "https://www.notion.so/product/ai", description: "智能写作助手" },
                        { name: "Grammarly", icon: "📖", url: "https://www.grammarly.com", description: "语法检查" },
                        { name: "Runway", icon: "🎬", url: "https://runway.ml", description: "AI视频编辑" },
                        { name: "Murf", icon: "🎙️", url: "https://murf.ai", description: "AI语音合成" }
                    ]
                },
                {
                    id: "development",
                    name: "开发工具",
                    icon: "⚙️",
                    description: "开发者必备的工具集合",
                    sites: [
                        { name: "VS Code", icon: "💾", url: "https://code.visualstudio.com", description: "代码编辑器" },
                        { name: "GitHub", icon: "🐙", url: "https://github.com", description: "代码托管平台" },
                        { name: "Stack Overflow", icon: "📚", url: "https://stackoverflow.com", description: "编程问答社区" },
                        { name: "CodePen", icon: "✏️", url: "https://codepen.io", description: "前端代码演示" },
                        { name: "JSFiddle", icon: "🔧", url: "https://jsfiddle.net", description: "在线代码测试" },
                        { name: "Vercel", icon: "▲", url: "https://vercel.com", description: "应用部署平台" }
                    ]
                },
                {
                    id: "social",
                    name: "社交媒体",
                    icon: "👥",
                    description: "连接世界的社交平台",
                    sites: [
                        { name: "微信", icon: "💬", url: "https://wx.qq.com", description: "即时通讯" },
                        { name: "微博", icon: "🐦", url: "https://www.weibo.com", description: "社交分享" },
                        { name: "抖音", icon: "🎵", url: "https://www.douyin.com", description: "短视频平台" },
                        { name: "小红书", icon: "📖", url: "https://www.xiaohongshu.com", description: "生活分享" },
                        { name: "知乎", icon: "💭", url: "https://www.zhihu.com", description: "知识问答" },
                        { name: "B站", icon: "📺", url: "https://www.bilibili.com", description: "视频弹幕网" }
                    ]
                },
                {
                    id: "shopping",
                    name: "购物消费",
                    icon: "🛒",
                    description: "便捷的购物体验",
                    sites: [
                        { name: "淘宝", icon: "🛍️", url: "https://www.taobao.com", description: "综合购物平台" },
                        { name: "京东", icon: "📦", url: "https://www.jd.com", description: "品质购物" },
                        { name: "天猫", icon: "🐱", url: "https://www.tmall.com", description: "品牌商城" },
                        { name: "拼多多", icon: "🍎", url: "https://www.pinduoduo.com", description: "团购平台" },
                        { name: "苏宁", icon: "🏪", url: "https://www.suning.com", description: "电器购物" },
                        { name: "唯品会", icon: "💎", url: "https://www.vip.com", description: "品牌特卖" }
                    ]
                },
                {
                    id: "entertainment",
                    name: "娱乐休闲",
                    icon: "🎮",
                    description: "放松身心的娱乐选择",
                    sites: [
                        { name: "网易云音乐", icon: "🎵", url: "https://music.163.com", description: "音乐播放" },
                        { name: "QQ音乐", icon: "🎶", url: "https://y.qq.com", description: "腾讯音乐" },
                        { name: "爱奇艺", icon: "📺", url: "https://www.iqiyi.com", description: "视频播放" },
                        { name: "腾讯视频", icon: "🎬", url: "https://v.qq.com", description: "腾讯视频" },
                        { name: "优酷", icon: "📽️", url: "https://www.youku.com", description: "优酷视频" },
                        { name: "Steam", icon: "🎮", url: "https://store.steampowered.com", description: "游戏平台" }
                    ]
                },
                {
                    id: "education",
                    name: "学习教育",
                    icon: "📚",
                    description: "知识学习的好去处",
                    sites: [
                        { name: "中国大学MOOC", icon: "🎓", url: "https://www.icourse163.org", description: "在线课程" },
                        { name: "学堂在线", icon: "📖", url: "https://www.xuetangx.com", description: "清华在线教育" },
                        { name: "慕课网", icon: "💻", url: "https://www.imooc.com", description: "IT技能学习" },
                        { name: "网易公开课", icon: "🏫", url: "https://open.163.com", description: "免费公开课" },
                        { name: "腾讯课堂", icon: "📱", url: "https://ke.qq.com", description: "在线职业教育" },
                        { name: "百度文库", icon: "📄", url: "https://wenku.baidu.com", description: "文档分享" }
                    ]
                }
            ]
        };
    }

    // 渲染页面内容
    renderContent() {
        const app = document.getElementById('app');
        if (!app) return;
        
        app.innerHTML = `
            ${this.renderHeader()}
            ${this.renderQuickAccess()}
            ${this.renderCategories()}
            ${this.renderFooter()}
        `;
    }

    // 渲染头部
    renderHeader() {
        return `
            <header class="header">
                <div class="container">
                    <div class="header-content">
                        <div class="logo">
                            <span class="logo-icon">🧭</span>
                            <h1>我的导航</h1>
                        </div>
                        <div class="search-container">
                            <div class="search-box">
                                <input type="text" id="searchInput" placeholder="搜索网站..." class="search-input">
                                <button class="search-btn">🔍</button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        `;
    }

    // 渲染快速访问
    renderQuickAccess() {
        const quickSites = this.getFilteredSites(this.sitesData.quickAccess);
        
        return `
            <section class="quick-access">
                <div class="container">
                    <h2 class="section-title">快速访问</h2>
                    <div class="quick-grid">
                        ${quickSites.map(site => `
                            <a href="${site.url}" target="_blank" class="quick-item" data-name="${site.name}">
                                <div class="quick-icon">${site.icon}</div>
                                <span class="quick-name">${site.name}</span>
                            </a>
                        `).join('')}
                    </div>
                </div>
            </section>
        `;
    }

    // 渲染分类导航
    renderCategories() {
        return `
            <section class="categories">
                <div class="container">
                    <div class="category-filters">
                        <button class="filter-btn ${this.currentCategory === 'all' ? 'active' : ''}" data-category="all">
                            全部
                        </button>
                        ${this.sitesData.categories.map(category => `
                            <button class="filter-btn ${this.currentCategory === category.id ? 'active' : ''}" data-category="${category.id}">
                                ${category.icon} ${category.name}
                            </button>
                        `).join('')}
                    </div>
                    
                    <div class="categories-grid">
                        ${this.getVisibleCategories().map(category => this.renderCategory(category)).join('')}
                    </div>
                </div>
            </section>
        `;
    }

    // 渲染单个分类
    renderCategory(category) {
        const filteredSites = this.getFilteredSites(category.sites);
        
        if (filteredSites.length === 0) return '';
        
        return `
            <div class="category-card" data-category="${category.id}">
                <div class="category-header">
                    <div class="category-title">
                        <span class="category-icon">${category.icon}</span>
                        <h3>${category.name}</h3>
                    </div>
                    <p class="category-description">${category.description}</p>
                </div>
                <div class="sites-grid">
                    ${filteredSites.map(site => `
                        <a href="${site.url}" target="_blank" class="site-item" data-name="${site.name}">
                            <div class="site-icon">${site.icon}</div>
                            <div class="site-info">
                                <h4 class="site-name">${site.name}</h4>
                                <p class="site-description">${site.description}</p>
                            </div>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // 渲染页脚
    renderFooter() {
        return `
            <footer class="footer">
                <div class="container">
                    <div class="footer-content">
                        <p>© 2024 我的导航 - 让网络更简单</p>
                        <div class="footer-links">
                            <a href="#" onclick="nav.showAbout(); return false;">关于</a>
                            <a href="#" onclick="nav.showContact(); return false;">联系</a>
                            <a href="#" onclick="nav.showSettings(); return false;">设置</a>
                        </div>
                    </div>
                </div>
            </footer>
        `;
    }

    // 设置事件监听器
    setupEventListeners() {
        // 搜索功能
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.updateDisplay();
            });
        }

        // 分类过滤
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                const category = e.target.getAttribute('data-category');
                this.setCategory(category);
            }
        });

        // 搜索按钮
        const searchBtn = document.querySelector('.search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                if (searchInput) searchInput.focus();
            });
        }

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (searchInput) searchInput.focus();
            }
            if (e.key === 'Escape' && document.activeElement === searchInput) {
                searchInput.value = '';
                this.searchTerm = '';
                this.updateDisplay();
            }
        });
    }

    // 设置分类
    setCategory(category) {
        this.currentCategory = category;
        this.updateDisplay();
        
        // 更新按钮状态
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-category="${category}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    // 获取可见的分类
    getVisibleCategories() {
        if (this.currentCategory === 'all') {
            return this.sitesData.categories;
        }
        return this.sitesData.categories.filter(cat => cat.id === this.currentCategory);
    }

    // 获取过滤后的网站
    getFilteredSites(sites) {
        if (!sites) return [];
        
        return sites.filter(site => {
            const matchesSearch = !this.searchTerm || 
                site.name.toLowerCase().includes(this.searchTerm) ||
                (site.description && site.description.toLowerCase().includes(this.searchTerm));
            
            return matchesSearch;
        });
    }

    // 更新显示
    updateDisplay() {
        const categoriesContainer = document.querySelector('.categories-grid');
        if (categoriesContainer) {
            categoriesContainer.innerHTML = this.getVisibleCategories()
                .map(category => this.renderCategory(category)).join('');
        }

        const quickGrid = document.querySelector('.quick-grid');
        if (quickGrid) {
            const filteredQuickSites = this.getFilteredSites(this.sitesData.quickAccess);
            quickGrid.innerHTML = filteredQuickSites.map(site => `
                <a href="${site.url}" target="_blank" class="quick-item" data-name="${site.name}">
                    <div class="quick-icon">${site.icon}</div>
                    <span class="quick-name">${site.name}</span>
                </a>
            `).join('');
        }
    }

    // 显示关于页面
    showAbout() {
        this.showModal('关于我们', `
            <div class="modal-content">
                <h3>🧭 我的导航</h3>
                <p>一个简洁、高效的个人导航页面，帮助你快速访问常用网站。</p>
                <h4>特性：</h4>
                <ul>
                    <li>🔍 智能搜索</li>
                    <li>📱 响应式设计</li>
                    <li>⚡ 快速加载</li>
                    <li>🎨 美观界面</li>
                </ul>
                <p>版本：1.0.0</p>
            </div>
        `);
    }

    // 显示联系页面
    showContact() {
        this.showModal('联系我们', `
            <div class="modal-content">
                <h3>📬 联系方式</h3>
                <p>如有问题或建议，请通过以下方式联系我们：</p>
                <div class="contact-info">
                    <p>📧 邮箱：admin@example.com</p>
                    <p>🐦 微博：@我的导航</p>
                    <p>💬 微信：MyNavigation</p>
                </div>
                <p>我们会尽快回复您的消息。</p>
            </div>
        `);
    }

    // 显示设置页面
    showSettings() {
        this.showModal('设置', `
            <div class="modal-content">
                <h3>⚙️ 个性化设置</h3>
                <div class="settings-group">
                    <label>
                        <input type="checkbox" id="darkMode"> 深色模式
                    </label>
                    <label>
                        <input type="checkbox" id="compactMode"> 紧凑模式
                    </label>
                    <label>
                        <input type="checkbox" id="showDescriptions" checked> 显示描述
                    </label>
                </div>
                <button onclick="nav.saveSettings()" class="save-btn">保存设置</button>
            </div>
        `);
    }

    // 显示模态框
    showModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // 保存设置
    saveSettings() {
        const settings = {
            darkMode: document.getElementById('darkMode')?.checked || false,
            compactMode: document.getElementById('compactMode')?.checked || false,
            showDescriptions: document.getElementById('showDescriptions')?.checked || true
        };
        
        this.applySettings(settings);
        
        // 关闭模态框
        const modalOverlay = document.querySelector('.modal-overlay');
        if (modalOverlay) {
            modalOverlay.remove();
        }
        
        // 显示保存成功提示
        this.showToast('设置已保存！');
    }

    // 应用设置
    applySettings(settings) {
        document.body.classList.toggle('dark-mode', settings.darkMode);
        document.body.classList.toggle('compact-mode', settings.compactMode);
        document.body.classList.toggle('hide-descriptions', !settings.showDescriptions);
    }

    // 显示提示消息
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 100);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 2000);
    }
}

// 页面加载完成后初始化
let nav;

function initNav() {
    console.log('初始化导航...');
    nav = new NavigationManager();
}

// 多种方式确保初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
} else {
    initNav();
}

// 备用初始化
setTimeout(() => {
    if (!nav) {
        console.log('备用初始化执行');
        initNav();
    }
}, 100);
