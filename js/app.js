/* ===================================================
   app.js — 嵌入式学习笔记 核心逻辑
   支持服务端 API + localStorage 双模数据加载
   =================================================== */

// ===== API 模块 =====
const API_BASE = '';
let _serverAvailable = null;
let _isAdmin = null;

async function apiAvailable() {
  if (_serverAvailable !== null) return _serverAvailable;
  try {
    const res = await fetch(API_BASE + '/api/posts', { signal: AbortSignal.timeout(1500) });
    _serverAvailable = res.ok;
  } catch (e) {
    _serverAvailable = false;
  }
  return _serverAvailable;
}

function isAdmin() {
  if (_isAdmin !== null) return _isAdmin;
  _isAdmin = !!sessionStorage.getItem('blog_admin_token');
  return _isAdmin;
}

function getAuthHeaders() {
  const token = sessionStorage.getItem('blog_admin_token');
  return token ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
               : { 'Content-Type': 'application/json' };
}

async function apiGetPosts() {
  const res = await fetch(API_BASE + '/api/posts');
  if (!res.ok) throw new Error('API error');
  return res.json();
}

async function apiGetProfile() {
  const res = await fetch(API_BASE + '/api/profile');
  if (!res.ok) throw new Error('API error');
  return res.json();
}

async function apiSavePost(post) {
  const headers = getAuthHeaders();
  const isUpdate = post.id && post.id < 1000000000000 ? false : false;
  // 判断：如果 posts 中已存在同 id，用 PUT；否则用 POST
  const url = API_BASE + '/api/posts';
  const method = 'POST';
  const res = await fetch(url, { method, headers, body: JSON.stringify(post) });
  if (!res.ok) throw new Error('保存失败');
  return res.json();
}

async function apiUpdatePost(post) {
  const headers = getAuthHeaders();
  const res = await fetch(API_BASE + '/api/posts/' + post.id, {
    method: 'PUT', headers, body: JSON.stringify(post)
  });
  if (!res.ok) throw new Error('更新失败');
  return res.json();
}

async function apiDeletePost(id) {
  const headers = getAuthHeaders();
  const res = await fetch(API_BASE + '/api/posts/' + id, { method: 'DELETE', headers });
  if (!res.ok) throw new Error('删除失败');
}

async function apiSaveProfile(profile) {
  const headers = getAuthHeaders();
  const res = await fetch(API_BASE + '/api/profile', {
    method: 'PUT', headers, body: JSON.stringify(profile)
  });
  if (!res.ok) throw new Error('保存失败');
  return res.json();
}

// ===== Markdown 配置 =====
if (typeof marked !== 'undefined') {
  marked.setOptions({ breaks: true, gfm: true });
}

// ===== 数据操作 =====
const STORAGE_KEY = 'blog_posts';
const PROFILE_KEY = 'blog_profile';
const INIT_KEY = 'blog_initialized';

function getPosts() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function savePosts(posts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

// ===== 个人信息 =====
function getProfile() {
  return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
}

function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function getDefaultProfile() {
  return {
    nickname: '嵌入式爱好者',
    bio: '一名正在学习嵌入式开发的大学生',
    avatar: '',
    github: '',
    email: '',
    bilibili: ''
  };
}

function ensureProfile() {
  let p = getProfile();
  if (!p.nickname) { p = getDefaultProfile(); saveProfile(p); }
  return p;
}

// ===== 初始化示例数据 =====
function initSampleData() {
  if (localStorage.getItem(INIT_KEY) === 'true') return;
  localStorage.setItem(INIT_KEY, 'true');
  ensureProfile();

  const posts = getPosts();
  if (posts.length > 0) return;

  const samples = [
    {
      id: Date.now() - 86400000 * 2,
      title: 'STM32 点灯：嵌入式入门的第一个程序',
      content: `## 背景

学习嵌入式第一个项目就是点亮 LED，相当于编程里的 "Hello World"。

## 硬件准备

- STM32F103C8T6 开发板
- ST-Link 下载器
- 一个 LED + 220Ω 电阻
- 面包板 + 杜邦线

## 代码实现

\`\`\`c
#include "stm32f10x.h"

void GPIO_Config(void) {
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOB, ENABLE);

    GPIO_InitTypeDef GPIO_InitStructure;
    GPIO_InitStructure.GPIO_Pin = GPIO_Pin_0;
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_PP;
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_Init(GPIOB, &GPIO_InitStructure);
}

int main(void) {
    GPIO_Config();
    while (1) {
        GPIO_SetBits(GPIOB, GPIO_Pin_0);
        Delay(500000);
        GPIO_ResetBits(GPIOB, GPIO_Pin_0);
        Delay(500000);
    }
}
\`\`\`

## 遇到的问题

> **问题：** 下载程序后 LED 不亮
>
> **原因：** 忘了调用 RCC_APB2PeriphClockCmd 使能 GPIOB 时钟
>
> **解决：** 加上时钟使能，恢复正常

## 总结

点灯虽简单，但涉及 GPIO 配置、时钟使能、延时函数等基本概念。`,
      category: '学习笔记',
      tags: ['STM32', 'GPIO', '入门'],
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      pinned: true
    },
    {
      id: Date.now() - 86400000,
      title: 'I2C 通信调试：从机无应答问题排查',
      content: `## 问题描述

用 STM32F4 通过 I2C 读取 MPU6050 传感器数据时，发送从机地址后一直收不到 ACK。

## 排查过程

### 1. 检查硬件连接

\`\`\`
SCL — PB6
SDA — PB7
VCC — 3.3V
GND — GND
\`\`\`

MPU6050 模块自带 4.7kΩ 上拉电阻，排除上拉问题。

### 2. 检查 I2C 配置

\`\`\`c
I2C_InitTypeDef i2c;
i2c.I2C_ClockSpeed = 400000;
i2c.I2C_Mode = I2C_Mode_I2C;
i2c.I2C_DutyCycle = I2C_DutyCycle_2;
i2c.I2C_Ack = I2C_Ack_Enable;
i2c.I2C_AcknowledgedAddress = I2C_AcknowledgedAddress_7bit;
I2C_Init(I2C1, &i2c);
I2C_Cmd(I2C1, ENABLE);
\`\`\`

配置看起来没问题。

### 3. 发现真相

查阅 MPU6050 数据手册：**AD0 引脚接地时地址为 0x68，接 VCC 时为 0x69**。

实际电路中 AD0 接的是 VCC，而代码用的是 \`0x68 << 1\`。

### 4. 修复

\`\`\`c
#define MPU6050_ADDR   (0x69 << 1)  // AD0 = VCC
\`\`\`

修改后通信恢复正常。

## 经验

1. 先查数据手册，确认设备地址
2. 逻辑分析仪是 I2C 调试利器
3. 不假设模块默认配置`,
      category: '问题记录',
      tags: ['I2C', 'MPU6050', '调试'],
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      pinned: false
    },
    {
      id: Date.now() - 3600000,
      title: 'FreeRTOS 优先级反转问题的分析与解决',
      content: `## 场景

在一个 FreeRTOS 项目中，有三个任务：

| 任务 | 优先级 | 功能 |
|------|--------|------|
| Task_High | 3 | 处理传感器数据 |
| Task_Mid | 2 | LED 闪烁 |
| Task_Low | 1 | 将数据写入 SD 卡 |

Task_High 和 Task_Low 共享同一个互斥锁。

## 问题

Task_High 偶尔出现无法及时响应，导致传感器数据丢失。

## 分析

1. Task_Low 获取互斥锁，开始写入 SD 卡
2. Task_Mid 就绪（优先级 2 > 1），抢占 Task_Low
3. Task_High 就绪（优先级 3 > 2），需要互斥锁，但锁被 Task_Low 持有
4. Task_Low 被 Task_Mid 抢占，无法运行，无法释放锁
5. Task_High 无限等待 → **优先级反转**

## 解决

使用 FreeRTOS 互斥量代替二值信号量：

\`\`\`c
// 错误：用二值信号量
xSemaphoreCreateBinary();

// 正确：用互斥量（支持优先级继承）
xSemaphoreCreateMutex();
\`\`\`

FreeRTOS 互斥量内置**优先级继承**机制：持有锁的低优先级任务临时提升到等待者的优先级。

## 效果

Task_High 最大响应延迟从 320ms 降到 5ms 以内。

> 注意：优先级继承只能解决反转问题，不能解决死锁。`,
      category: '项目分析',
      tags: ['FreeRTOS', '实时系统', '优先级反转'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: false
    }
  ];

  savePosts(samples);
}

// ===== 渲染个人信息卡片 =====
function renderProfileCard() {
  const container = document.getElementById('profileCard');
  if (!container) return;
  const p = ensureProfile();
  const posts = getPosts();
  const categories = new Set(posts.map(p => p.category)).size;
  const tags = new Set(posts.flatMap(p => p.tags)).size;

  const initDateStr = localStorage.getItem(INIT_KEY) === 'true'
    ? (posts.length > 0 ? posts[posts.length - 1].createdAt : new Date().toISOString())
    : new Date().toISOString();
  const days = Math.max(1, Math.floor((Date.now() - new Date(initDateStr).getTime()) / 86400000));

  const avatarHtml = p.avatar
    ? `<img src="${escapeHtml(p.avatar)}" alt="头像" onerror="this.parentElement.textContent='!'; this.remove();">`
    : '!';

  // 访客可点击查看详情
  const clickAttr = !isAdmin() ? 'onclick="openProfileDetail()" style="cursor:pointer;"' : '';

  container.innerHTML = `
    <div class="profile-card" ${clickAttr}>
      <div class="profile-avatar">${avatarHtml}</div>
      <div class="profile-info">
        <div class="nickname">${escapeHtml(p.nickname)}</div>
        <div class="bio">${escapeHtml(p.bio)}</div>
        <div class="profile-stats">
          <div class="stat"><span class="value">${days}</span><span class="label">天</span></div>
          <div class="stat"><span class="value">${posts.length}</span><span class="label">篇文章</span></div>
          <div class="stat"><span class="value">${categories}</span><span class="label">个分类</span></div>
          <div class="stat"><span class="value">${tags}</span><span class="label">个标签</span></div>
        </div>
        <div class="profile-links">
          ${p.github ? `<a href="https://github.com/${escapeHtml(p.github)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">GitHub</a>` : ''}
          ${p.email ? `<a href="mailto:${escapeHtml(p.email)}" onclick="event.stopPropagation()">邮箱</a>` : ''}
          ${p.bilibili ? `<a href="https://space.bilibili.com/${escapeHtml(p.bilibili)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">B站</a>` : ''}
        </div>
      </div>
      ${isAdmin() ? '<button class="profile-edit" onclick="event.stopPropagation();openSettings()">编辑</button>' : ''}
    </div>`;
}

// ===== 侧边栏迷你个人信息 =====
function renderSidebarProfile() {
  const container = document.getElementById('sidebarProfile');
  if (!container) return;
  const p = ensureProfile();
  const avatarHtml = p.avatar
    ? `<img src="${escapeHtml(p.avatar)}" alt="头像" onerror="this.parentElement.textContent='!'; this.remove();">`
    : '!';

  container.innerHTML = `
    <div class="sidebar-profile">
      <div class="sp-avatar">${avatarHtml}</div>
      <div class="sp-nickname">${escapeHtml(p.nickname)}</div>
      <div class="sp-bio">${escapeHtml(p.bio)}</div>
    </div>`;
}

// ===== 分类颜色映射 =====
function getCategoryClass(category) {
  const map = {
    '学习笔记': 'cat-学习笔记',
    '问题记录': 'cat-问题记录',
    '项目分析': 'cat-项目分析',
    '经验总结': 'cat-经验总结',
    '其他': 'cat-其他'
  };
  return map[category] || 'cat-其他';
}

// ============================================================
// 新增功能2：阅读时长计算
// 公式：中文约 300 字/分钟，最少 1 分钟
// ============================================================
function getReadTime(content) {
  const text = content.replace(/[#*`\>\-\[\]()!|\s]/g, '');
  return Math.max(1, Math.ceil(text.length / 300));
}

// ===== 渲染文章列表 =====
let currentFilter = '全部';
let currentSearchQuery = '';
let _firstRenderDone = false;

function showSkeletons(container) {
  container.innerHTML = Array(3).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-line w-30 h-sm"></div>
      <div class="skeleton-line w-60"></div>
      <div class="skeleton-line w-80 h-sm"></div>
      <div class="skeleton-line w-40 h-sm"></div>
    </div>
  `).join('');
}

function renderPosts() {
  const posts = getPosts();
  const container = document.getElementById('postList');
  if (!container) return;

  // 首次加载显示骨架屏
  if (!_firstRenderDone && posts.length > 0) {
    showSkeletons(container);
    _firstRenderDone = true;
    requestAnimationFrame(() => {
      setTimeout(() => renderPosts(), 400);
    });
    return;
  }

  // 先按分类筛选
  let filtered = currentFilter === '全部'
    ? posts
    : posts.filter(p => p.category === currentFilter);

  // 再按搜索词过滤（新增功能1）
  if (currentSearchQuery) {
    const q = currentSearchQuery.toLowerCase();
    filtered = filtered.filter(p => {
      const titleMatch = p.title.toLowerCase().includes(q);
      const plainContent = p.content.replace(/[#*`\>\-\[\]()!|]/g, '').replace(/\s+/g, ' ');
      const contentMatch = plainContent.toLowerCase().includes(q);
      return titleMatch || contentMatch;
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">${currentSearchQuery ? '搜索无结果' : (posts.length === 0 ? '还没有文章' : '没有找到')}</div>
        <h3>${currentSearchQuery ? '没有匹配的文章' : (posts.length === 0 ? '还没有文章' : '没有找到相关文章')}</h3>
        <p>${currentSearchQuery ? '换个关键词试试' : (posts.length === 0 ? '点击右上角「写文章」开始记录吧' : '换个分类试试')}</p>
        ${posts.length === 0 && !currentSearchQuery ? '<button class="btn-primary" onclick="location.href=\'editor.html\'">写第一篇文章</button>' : ''}
      </div>`;
    return;
  }

  const sorted = [...filtered].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  container.innerHTML = sorted.map(p => `
    <div class="post-card ${getCategoryClass(p.category)}" onclick="openPost(${p.id})">
      <span class="ink-stain" style="right:${inkPos(p.id)}%;bottom:${inkPos(p.id+1)}%;transform:rotate(${inkRot(p.id)}deg);">${inkChar(p.id)}</span>
      <div class="meta">
        <span class="category">${p.category}</span>
        ${p.pinned ? '<span class="pinned">置顶</span>' : ''}
        <span class="divider">|</span>
        <span class="date">${formatDate(p.createdAt)}</span>
        <span class="read-time">约${getReadTime(p.content)}分钟</span>
      </div>
      <h2>${highlightSearch(p.title)}</h2>
      <div class="summary">${highlightSearch(getSummary(p.content))}</div>
      <div class="tags">${p.tags.map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>
      ${isAdmin() ? `
      <div class="card-actions" onclick="event.stopPropagation()">
        <button class="btn-ghost" onclick="editPost(${p.id})">编辑</button>
        <button class="btn-ghost" style="color:var(--danger);" onclick="requestDelete(${p.id})">删除</button>
      </div>` : ''}
    </div>
  `).join('');

  observeCards();
}

function getSummary(content) {
  const text = content.replace(/[#*`\>\-\[\]()!|]/g, '').replace(/\s+/g, ' ').trim();
  return text.substring(0, 150) + (text.length > 150 ? '...' : '');
}

// 搜索高亮辅助
function highlightSearch(text) {
  if (!currentSearchQuery) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const q = currentSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const html = escaped.replace(new RegExp(`(${q})`, 'gi'), '<mark class="search-mark">$1</mark>');
  return html;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 墨渍水印辅助函数
const INK_CHARS = ['墨','印','篆','記','筆','硯','書','卷','章','跡'];
function inkChar(id) {
  return INK_CHARS[Math.abs(id) % INK_CHARS.length];
}
function inkPos(seed) {
  return 3 + (Math.abs(seed * 7 + 3) % 18);
}
function inkRot(seed) {
  return -25 + (Math.abs(seed * 13 + 5) % 50);
}

// ===== 分类筛选 =====
function renderCategories() {
  const container = document.getElementById('categoryFilter');
  if (!container) return;
  const posts = getPosts();
  const categories = ['全部', ...new Set(posts.map(p => p.category))];
  container.innerHTML = categories.map(c => `
    <button class="filter-item ${c === currentFilter ? 'active' : ''}"
            onclick="filterByCategory('${c}')">
      ${c}
      <span class="count">${c === '全部' ? posts.length : posts.filter(p => p.category === c).length}</span>
    </button>
  `).join('');
}

// ============================================================
// 新增功能5：标签云权重 — 字号按文章数量等比缩放（min 12px max 28px）
// ============================================================
function renderTags() {
  const container = document.getElementById('tagCloud');
  if (!container) return;
  const posts = getPosts();
  const tagCount = {};
  posts.forEach(p => p.tags.forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; }));
  const sorted = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 20);

  if (sorted.length === 0) {
    container.innerHTML = '<span style="font-size:.72rem;color:var(--text-dim);">暂无标签</span>';
    return;
  }

  const counts = sorted.map(s => s[1]);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);
  const range = maxCount - minCount || 1; // 避免除0

  container.innerHTML = sorted.map(([tag, count]) => {
    // 字号等比缩放：12px ~ 28px
    const fontSize = 12 + ((count - minCount) / range) * 16;
    return `<span class="tag-badge" data-tag="${escapeHtml(tag)}" style="font-size:${fontSize}px;">${escapeHtml(tag)} ${count}</span>`;
  }).join('');
}

// ===== 筛选 =====
function filterByCategory(c) {
  currentFilter = c;
  document.querySelectorAll('.filter-item').forEach(el => el.classList.remove('active'));
  const btn = [...document.querySelectorAll('.filter-item')].find(el => el.textContent.trim().startsWith(c));
  if (btn) btn.classList.add('active');
  renderPosts();
}

function filterByTag(tag) {
  const posts = getPosts();
  const filtered = posts.filter(p => p.tags.includes(tag));
  const container = document.getElementById('postList');
  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="icon">没有找到</div><h3>没有找到标签为 "${escapeHtml(tag)}" 的文章</h3></div>`;
    return;
  }
  container.innerHTML = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(p => `
    <div class="post-card ${getCategoryClass(p.category)}" onclick="openPost(${p.id})">
      <span class="ink-stain" style="right:${inkPos(p.id)}%;bottom:${inkPos(p.id+1)}%;transform:rotate(${inkRot(p.id)}deg);">${inkChar(p.id)}</span>
      <div class="meta">
        <span class="category">${p.category}</span>
        ${p.pinned ? '<span class="pinned">置顶</span>' : ''}
        <span class="divider">|</span>
        <span class="date">${formatDate(p.createdAt)}</span>
        <span class="read-time">约${getReadTime(p.content)}分钟</span>
      </div>
      <h2>${escapeHtml(p.title)}</h2>
      <div class="summary">${getSummary(p.content)}</div>
      <div class="tags">${p.tags.map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>
    </div>
  `).join('');
  observeCards();
}

// ===== 需求14：代码块增强 — 行号 + 语言标签 + 复制按钮 =====
function enhanceCodeBlocks(container) {
  const pres = container.querySelectorAll('pre');
  pres.forEach(pre => {
    if (pre.parentElement.classList.contains('code-block-wrapper')) return;

    const code = pre.querySelector('code');
    const codeText = code ? code.textContent : pre.textContent;

    let lang = '';
    if (code) {
      const classes = code.className.split(' ');
      const langClass = classes.find(c => c.startsWith('language-'));
      if (langClass) lang = langClass.replace('language-', '');
    }

    const lines = codeText.split('\n');
    if (lines.length > 1 && lines[lines.length - 1].trim() === '') lines.pop();

    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';

    const header = document.createElement('div');
    header.className = 'code-block-header';
    header.innerHTML = `
      <span class="code-lang-tag">${lang || 'code'}</span>
      <button class="code-copy-btn" onclick="copyCodeBlock(this)">复制</button>
    `;

    const codeBody = document.createElement('div');
    codeBody.className = 'code-with-lines';
    codeBody.innerHTML = lines.map((line, i) => `
      <div class="line-row">
        <span class="line-num">${i + 1}</span>
        <span class="line-code">${escapeHtml(line)}</span>
      </div>
    `).join('');

    wrapper.dataset.code = codeText;
    wrapper.appendChild(header);
    wrapper.appendChild(codeBody);
    pre.replaceWith(wrapper);
  });

  if (typeof hljs !== 'undefined') {
    container.querySelectorAll('.code-with-lines .line-code').forEach(el => {
      const parent = el.closest('.code-block-wrapper');
      if (parent && !parent.dataset.highlighted) {
        parent.dataset.highlighted = '1';
        const rawCode = parent.dataset.code || '';
        const langTag = parent.querySelector('.code-lang-tag');
        const lang = langTag ? langTag.textContent : '';
        if (lang && lang !== 'code') {
          try {
            const result = hljs.highlight(rawCode, { language: lang, ignoreIllegals: true });
            const lineCodes = parent.querySelectorAll('.line-code');
            const resultLines = result.value.split('\n');
            if (resultLines.length > 1 && resultLines[resultLines.length - 1].trim() === '') resultLines.pop();
            lineCodes.forEach((lc, i) => {
              if (resultLines[i] !== undefined) lc.innerHTML = resultLines[i];
            });
          } catch(e) { /* 高亮失败则保留原文 */ }
        }
      }
    });
  }
}

function copyCodeBlock(btn) {
  const wrapper = btn.closest('.code-block-wrapper');
  if (!wrapper) return;
  const code = wrapper.dataset.code || '';
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = '已复制';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '复制'; btn.classList.remove('copied'); }, 2000);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = code;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = '已复制';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '复制'; btn.classList.remove('copied'); }, 2000);
  });
}

// ============================================================
// 新增功能7：TOC 目录生成
// 从 post-content 的 HTML 提取 h1-h3，给标题加 id，生成目录
// ============================================================
function buildTOC(contentDiv) {
  const headings = contentDiv.querySelectorAll('h1, h2, h3');
  if (headings.length === 0) return null;

  const items = [];
  headings.forEach((h, i) => {
    const id = 'toc-' + i;
    h.id = id;
    items.push({ id, level: h.tagName.toLowerCase(), text: h.textContent });
  });

  return items;
}

function renderTOC(items) {
  if (!items || items.length === 0) return '';

  const html = items.map(item => `
    <a href="#${item.id}" class="toc-${item.level}" onclick="scrollToTOC('${item.id}');return false">${escapeHtml(item.text)}</a>
  `).join('');

  return `
    <div class="modal-toc">
      <div class="modal-toc-title">目录</div>
      ${html}
    </div>
  `;
}

// TOC 点击跳转（带平滑滚动）
function scrollToTOC(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ============================================================
// 新增功能6：上一篇/下一篇导航
// ============================================================
function renderPostNav(currentId) {
  const posts = getPosts();
  const sorted = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const idx = sorted.findIndex(p => p.id === currentId);
  if (idx === -1 || sorted.length <= 1) return '';

  const prev = idx < sorted.length - 1 ? sorted[idx + 1] : null;
  const next = idx > 0 ? sorted[idx - 1] : null;

  return `
    <div class="post-nav">
      ${prev ? `
        <div class="post-nav-item prev-only" onclick="closeModal();openPost(${prev.id})">
          <div class="post-nav-label">← 上一篇</div>
          <div class="post-nav-title">${escapeHtml(prev.title)}</div>
        </div>
      ` : '<div></div>'}
      ${next ? `
        <div class="post-nav-item next-only" onclick="closeModal();openPost(${next.id})" style="text-align:right;">
          <div class="post-nav-label">下一篇 →</div>
          <div class="post-nav-title">${escapeHtml(next.title)}</div>
        </div>
      ` : '<div></div>'}
    </div>
  `;
}

// ===== 文章详情 Modal =====
function openPost(id) {
  const posts = getPosts();
  const post = posts.find(p => p.id === id);
  if (!post) return;

  const body = document.getElementById('modalBody');
  const html = marked.parse(post.content);

  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:16px;font-size:.78rem;color:var(--text-dim);">
      <span style="background:var(--bg-subtle);padding:2px 12px;border-radius:var(--radius-full);color:var(--text-muted);">${post.category}</span>
      <span>${formatDate(post.createdAt)}</span>
      <span class="read-time">约${getReadTime(post.content)}分钟</span>
      ${post.tags.map(t => `<span style="color:var(--text-dim);">${escapeHtml(t)}</span>`).join(' ')}
    </div>
    <h1 style="font-family:var(--font-serif);font-size:1.55rem;font-weight:700;margin-bottom:20px;">${escapeHtml(post.title)}</h1>
    <div class="post-content">${html}</div>
  `;

  // 代码块增强
  const contentDiv = body.querySelector('.post-content');
  if (contentDiv) {
    enhanceCodeBlocks(contentDiv);

    // 新增功能7：TOC 目录
    const tocItems = buildTOC(contentDiv);
    const tocHTML = renderTOC(tocItems);
    if (tocHTML) {
      contentDiv.insertAdjacentHTML('afterbegin', tocHTML);
    }

    // 新增功能6：上/下篇导航
    const navHTML = renderPostNav(id);
    if (navHTML) {
      contentDiv.insertAdjacentHTML('beforeend', navHTML);
    }
  }

  document.getElementById('postModal').classList.add('open');
  document.body.style.overflow = 'hidden';

  if (typeof hljs !== 'undefined') {
    body.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));
  }
}

function closeModal() {
  document.getElementById('postModal').classList.remove('open');
  document.body.style.overflow = '';
}

// ===== 个人信息详情弹窗（访客只读） =====
async function openProfileDetail() {
  // 优先从服务端获取最新数据
  let p = ensureProfile();
  try {
    const res = await fetch('/api/profile');
    if (res.ok) { p = await res.json(); saveProfile(p); }
  } catch(e) {}

  // 也尝试从服务端获取文章来统计
  let posts = getPosts();
  try {
    const res = await fetch('/api/posts');
    if (res.ok) { posts = await res.json(); }
  } catch(e) {}
  const avatarHtml = p.avatar
    ? `<img src="${escapeHtml(p.avatar)}" alt="头像" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid var(--border);">`
    : `<div style="width:80px;height:80px;border-radius:50%;background:var(--bg-subtle);display:flex;align-items:center;justify-content:center;font-size:2rem;color:var(--text-dim);border:2px solid var(--border);">!</div>`;

  const tagSet = new Set(posts.flatMap(p => p.tags));
  const catSet = new Set(posts.map(p => p.category));

  document.getElementById('profileDetailBody').innerHTML = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:flex;justify-content:center;margin-bottom:12px;">${avatarHtml}</div>
      <h2 style="font-family:var(--font-serif);font-size:1.3rem;font-weight:700;color:var(--text);margin:0;">${escapeHtml(p.nickname)}</h2>
      <p style="font-size:.86rem;color:var(--text-muted);margin:4px 0 0;">${escapeHtml(p.bio)}</p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
      <div style="background:var(--bg-subtle);border-radius:var(--radius-sm);padding:12px;text-align:center;">
        <div style="font-family:var(--font-serif);font-size:1.4rem;font-weight:700;color:var(--seal);">${posts.length}</div>
        <div style="font-size:.72rem;color:var(--text-dim);">文章</div>
      </div>
      <div style="background:var(--bg-subtle);border-radius:var(--radius-sm);padding:12px;text-align:center;">
        <div style="font-family:var(--font-serif);font-size:1.4rem;font-weight:700;color:var(--seal);">${tagSet.size}</div>
        <div style="font-size:.72rem;color:var(--text-dim);">标签</div>
      </div>
    </div>

    ${catSet.size > 0 ? `
    <div style="margin-bottom:14px;">
      <div style="font-size:.72rem;font-weight:600;color:var(--text-dim);margin-bottom:6px;">写作分类</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${[...catSet].map(c => `<span style="background:var(--bg-subtle);padding:2px 12px;border-radius:var(--radius-full);font-size:.76rem;color:var(--text-muted);">${escapeHtml(c)}</span>`).join('')}
      </div>
    </div>` : ''}

    ${tagSet.size > 0 ? `
    <div style="margin-bottom:14px;">
      <div style="font-size:.72rem;font-weight:600;color:var(--text-dim);margin-bottom:6px;">常用标签</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;">
        ${[...tagSet].slice(0, 12).map(t => `<span style="background:var(--bg-subtle);padding:2px 10px;border-radius:var(--radius-full);font-size:.72rem;color:var(--text-dim);">${escapeHtml(t)}</span>`).join('')}
      </div>
    </div>` : ''}

    ${(p.github || p.email || p.bilibili) ? `
    <div style="border-top:1px solid var(--border);padding-top:14px;display:flex;gap:8px;justify-content:center;">
      ${p.github ? `<a href="https://github.com/${escapeHtml(p.github)}" target="_blank" rel="noopener" style="padding:6px 16px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.8rem;color:var(--text-muted);text-decoration:none;">GitHub</a>` : ''}
      ${p.email ? `<a href="mailto:${escapeHtml(p.email)}" style="padding:6px 16px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.8rem;color:var(--text-muted);text-decoration:none;">邮箱</a>` : ''}
      ${p.bilibili ? `<a href="https://space.bilibili.com/${escapeHtml(p.bilibili)}" target="_blank" rel="noopener" style="padding:6px 16px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.8rem;color:var(--text-muted);text-decoration:none;">B站</a>` : ''}
    </div>` : ''}
  `;

  document.getElementById('profileDetailModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeProfileDetail() {
  document.getElementById('profileDetailModal').classList.remove('open');
  document.body.style.overflow = '';
}

// ===== 删除 =====
let deleteTargetId = null;

function requestDelete(id) {
  deleteTargetId = id;
  document.getElementById('confirmOverlay').classList.add('open');
}

function cancelDelete() {
  deleteTargetId = null;
  document.getElementById('confirmOverlay').classList.remove('open');
}

async function confirmDelete() {
  if (!deleteTargetId) return;
  let posts = getPosts();
  posts = posts.filter(p => p.id !== deleteTargetId);
  savePosts(posts);
  cancelDelete();
  renderAll();
  showToast('已删除');

  // 同步到服务端
  if (await apiAvailable() && isAdmin()) {
    try { await apiDeletePost(deleteTargetId); } catch(e) {}
  }
}

function editPost(id) {
  location.href = 'editor.html?edit=' + id;
}

// ===== 设置弹窗 =====
function openSettings() {
  const p = ensureProfile();
  document.getElementById('setNickname').value = p.nickname || '';
  document.getElementById('setBio').value = p.bio || '';
  document.getElementById('setAvatar').value = p.avatar || '';
  document.getElementById('setGithub').value = p.github || '';
  document.getElementById('setEmail').value = p.email || '';
  document.getElementById('setBilibili').value = p.bilibili || '';
  document.getElementById('settingsOverlay').classList.add('open');
}

function closeSettings() {
  document.getElementById('settingsOverlay').classList.remove('open');
}

async function saveSettings() {
  const profile = {
    nickname: document.getElementById('setNickname').value.trim() || '嵌入式爱好者',
    bio: document.getElementById('setBio').value.trim() || '一名正在学习嵌入式开发的大学生',
    avatar: document.getElementById('setAvatar').value.trim(),
    github: document.getElementById('setGithub').value.trim(),
    email: document.getElementById('setEmail').value.trim(),
    bilibili: document.getElementById('setBilibili').value.trim()
  };
  saveProfile(profile);
  closeSettings();
  renderProfileCard();
  renderSidebarProfile();
  showToast('设置已保存');

  // 同步到服务端
  if (await apiAvailable() && isAdmin()) {
    try { await apiSaveProfile(profile); } catch(e) {}
  }
}

function resetAllData() {
  if (!confirm('确定要重置所有数据吗？此操作不可撤销！')) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(INIT_KEY);
  location.reload();
}

// ===== 主题 =====
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? null : 'dark';
  if (next === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem('blog_theme', next || 'light');
  // Bug1 修复：只更新 aria-label="切换主题" 的按钮，不影响设置按钮
  updateThemeIcon(document.querySelector('[aria-label="切换主题"]'));
}

function loadTheme() {
  const saved = localStorage.getItem('blog_theme');
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

// ===== Toast =====
function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// ============================================================
// 新增 UI 改进10：侧边栏统计卡片
// 显示：文章数、总字数、标签数
// ============================================================
function renderSidebarStats() {
  // 在标签云区域下方插入统计卡片
  const tagCloudSection = document.getElementById('tagCloud')?.parentElement;
  if (!tagCloudSection) return;

  // 移除旧统计卡片
  const oldStats = tagCloudSection.parentElement.querySelector('.sidebar-stats');
  if (oldStats) oldStats.remove();

  const posts = getPosts();
  const totalChars = posts.reduce((sum, p) => sum + p.content.replace(/[#*`\>\-\[\]()!|\s]/g, '').length, 0);
  const totalTags = new Set(posts.flatMap(p => p.tags)).size;

  const stats = document.createElement('div');
  stats.className = 'sidebar-stats';
  stats.innerHTML = `
    <h3>统计</h3>
    <div class="stat-row"><span>文章数</span><span class="stat-val">${posts.length}</span></div>
    <div class="stat-row"><span>总字数</span><span class="stat-val">${totalChars.toLocaleString()}</span></div>
    <div class="stat-row"><span>标签数</span><span class="stat-val">${totalTags}</span></div>
  `;

  // 插入到标签云 section 后面
  tagCloudSection.after(stats);
}

// ===== 归档时间轴 =====
function renderArchive() {
  const container = document.getElementById('archiveTimeline');
  if (!container) return;
  const posts = getPosts();
  if (posts.length === 0) {
    container.innerHTML = '<div style="font-size:.72rem;color:var(--text-dim);">暂无文章</div>';
    return;
  }
  const groups = {};
  const sorted = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  sorted.forEach(p => {
    const d = new Date(p.createdAt);
    const key = d.getFullYear() + '年' + (d.getMonth() + 1) + '月';
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });
  container.innerHTML = Object.entries(groups).map(([month, items], i) =>
    `<div class="archive-item" style="--i:${i};" onclick="filterByArchive('${month}')">${month}（${items.length}篇）</div>`
  ).join('');
}

function filterByArchive(monthKey) {
  const posts = getPosts();
  const container = document.getElementById('postList');
  const filtered = posts.filter(p => {
    const d = new Date(p.createdAt);
    const key = d.getFullYear() + '年' + (d.getMonth() + 1) + '月';
    return key === monthKey;
  });
  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state"><h3>该月没有文章</h3></div>`;
    return;
  }
  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  container.innerHTML = sorted.map(p => `
    <div class="post-card ${getCategoryClass(p.category)}" onclick="openPost(${p.id})">
      <span class="ink-stain" style="right:${inkPos(p.id)}%;bottom:${inkPos(p.id+1)}%;transform:rotate(${inkRot(p.id)}deg);">${inkChar(p.id)}</span>
      <div class="meta">
        <span class="category">${p.category}</span>
        ${p.pinned ? '<span class="pinned">置顶</span>' : ''}
        <span class="divider">|</span>
        <span class="date">${formatDate(p.createdAt)}</span>
        <span class="read-time">约${getReadTime(p.content)}分钟</span>
      </div>
      <h2>${escapeHtml(p.title)}</h2>
      <div class="summary">${getSummary(p.content)}</div>
      <div class="tags">${p.tags.map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>
    </div>
  `).join('');
  observeCards();
}

// ===== 全部渲染 =====
function renderAll() {
  renderProfileCard();
  renderSidebarProfile();
  renderPosts();
  renderCategories();
  renderTags();
  renderArchive();
  renderSidebarStats();
}

// ============================================================
// 卡片 3D tilt 效果 — 鼠标位置驱动 perspective 旋转
// ============================================================
function initCardTilt() {
  document.addEventListener('mousemove', function(e) {
    const cards = document.querySelectorAll('.post-card:hover');
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -3;
      const rotateY = ((x - centerX) / centerX) * 3;
      card.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(1)}deg) rotateY(${rotateY.toFixed(1)}deg) translateY(-8px)`;
    });
  });

  // 鼠标离开卡片时重置
  document.addEventListener('mouseleave', function(e) {
    const cards = document.querySelectorAll('.post-card');
    cards.forEach(card => {
      card.style.transform = '';
    });
  }, true);
}

// ============================================================
// 墨水粒子系统 — 墨滴扩散上浮 Canvas
// ============================================================
function initInkParticles() {
  const canvas = document.getElementById('inkParticles');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const particles = [];
  const MAX = 28;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  class InkDrop {
    constructor() {
      this.reset(true);
    }
    reset(initial) {
      this.x = Math.random() * canvas.width;
      this.y = initial ? Math.random() * canvas.height : canvas.height + 20;
      this.radius = 1 + Math.random() * 3.5;
      this.opacity = 0.02 + Math.random() * 0.08;
      this.vy = -(0.05 + Math.random() * 0.35); // 缓慢上浮
      this.vx = (Math.random() - 0.5) * 0.15;
      this.wobble = Math.random() * Math.PI * 2;
      this.wobbleSpeed = 0.002 + Math.random() * 0.008;
      this.wobbleAmp = 0.1 + Math.random() * 0.4;
      this.growRate = 0.001 + Math.random() * 0.004;
    }
    update() {
      this.y += this.vy;
      this.x += this.vx + Math.sin(this.wobble) * this.wobbleAmp;
      this.wobble += this.wobbleSpeed;
      this.radius += this.growRate;
      this.opacity -= 0.00002;
      if (this.y < -20 || this.opacity <= 0 || this.radius > 15) {
        this.reset(false);
      }
    }
    draw(ctx) {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const color = isDark ? '255,255,255' : '9,9,11';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color},${this.opacity.toFixed(3)})`;
      ctx.fill();
    }
  }

  while (particles.length < MAX) particles.push(new InkDrop());

  function animate() {
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(ctx); });
  }
  animate();
}

// ============================================================
// IntersectionObserver — 卡片入场 staggered 动画
// ============================================================
let cardObserver = null;

function observeCards() {
  if (cardObserver) cardObserver.disconnect();

  cardObserver = new IntersectionObserver((entries) => {
    const visibleCards = entries
      .filter(e => e.isIntersecting)
      .map(e => e.target)
      .sort((a, b) => {
        const position = a.compareDocumentPosition(b);
        return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });

    visibleCards.forEach((card, i) => {
      setTimeout(() => { card.classList.add('card-enter'); }, i * 100);
      cardObserver.unobserve(card);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.post-card:not(.card-enter)').forEach(card => {
    cardObserver.observe(card);
  });
}

// ============================================================
// 导航栏滚动毛玻璃
// ============================================================
let scrollTimer = null;
function initNavScroll() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (!scrollTimer) {
      scrollTimer = requestAnimationFrame(() => {
        const scrolled = window.scrollY > 10;
        navbar.classList.toggle('scrolled', scrolled);
        scrollTimer = null;
      });
    }
  }, { passive: true });
}

// ============================================================
// 按钮涟漪效果
// ============================================================
function initRipple() {
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.btn-write');
    if (!btn) return;

    const size = Math.max(btn.offsetWidth, btn.offsetHeight) * 1.5;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';

    btn.appendChild(ripple);
    ripple.addEventListener('animationend', function() { ripple.remove(); });
  });
}

// ============================================================
// 代码雨 Canvas
// ============================================================
function initCodeRain() {
  const canvas = document.getElementById('codeRain');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let frameCount = 0;

  // 新增功能5：降低透明度 + 扩展 8051 寄存器字符池
  const chars = [
    '0x1A','0xFF','GPIO','I2C','STM32','0x00','UART',
    'SPI','DMA','ISR','0x7F','ADC','PWM','RTOS','HAL',
    'NVIC','0x3F','APB2','F4','F103','0x55','TIM','EXTI',
    'RCC','USART','OLED','MPU6050','0xAA','CMSIS',
    'ACC','B','PSW','DPTR','SP','PCON','SBUF','IE','IP','TCON'
  ];

  const fontSize = 13;
  const columnWidth = 55;
  let drops = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colCount = Math.floor(canvas.width / columnWidth) + 1;
    drops = new Array(colCount).fill(0).map(() => Math.random() * canvas.height);
  }

  resize();
  window.addEventListener('resize', resize);

  function getColor() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return isDark ? 'rgba(250,250,250,0.04)' : 'rgba(9,9,11,0.04)';
  }

  function draw() {
    requestAnimationFrame(draw);
    frameCount++;
    if (frameCount % 2 !== 0) return; // 30fps 节流

    const color = getColor();
    ctx.fillStyle = color;
    ctx.font = fontSize + 'px "JetBrains Mono", "Consolas", monospace';

    for (let i = 0; i < drops.length; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      const x = i * columnWidth;
      ctx.fillText(char, x, drops[i]);
      drops[i] += fontSize + 2;
      if (drops[i] > canvas.height && Math.random() > 0.97) drops[i] = 0;
    }
  }

  draw();
}

// ============================================================
// 新增 UI 改进6：导航栏 SVG 图标
// 原理：动态替换 text/emoji 按钮为 inline SVG，主题切换时更新月亮/太阳
// ============================================================
function initNavIcons() {
  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  // 设置按钮 — 经典齿轮 SVG（齿圈+中心圆，一看就是设置）
  const settingsBtn = navActions.querySelector('[aria-label="设置"]');
  if (settingsBtn) {
    settingsBtn.className = 'theme-btn nav-icon';
    settingsBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M8.2 4.6l.8 1.4M15 18l.8 1.4M4.6 8.2l1.4.8M18 15l1.4.8M2 12h2.5M19.5 12H22M4.6 15.8l1.4-.8M18 9l1.4-.8M8.2 19.4l.8-1.4M15 6l.8-1.4"/></svg>`;
  }

  // 主题切换按钮 — 月亮/太阳 SVG（Bug1修复：仅此按钮参与主题切换）
  const themeBtn = navActions.querySelector('[aria-label="切换主题"]');
  if (themeBtn) {
    themeBtn.className = 'theme-btn nav-icon';
    updateThemeIcon(themeBtn);
  }

  // 搜索按钮若已被 initSearch 先创建则跳过（Bug2修复：避免重复创建）
  const existingSearch = navActions.querySelector('[aria-label="搜索"]');
  if (existingSearch) {
    existingSearch.className = 'search-toggle nav-icon';
  }
}

function updateThemeIcon(btn) {
  if (!btn) return;
  // Bug1修复：只对 aria-label="切换主题" 的按钮生效
  if (btn.getAttribute('aria-label') !== '切换主题') return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.innerHTML = isDark
    ? `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
    : `<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`;
}

// 劫持主题切换以更新图标
function initSearch() {
  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  // 在写文章按钮前插入搜索按钮和搜索框
  const writeBtn = navActions.querySelector('.btn-write');

  const searchToggle = document.createElement('button');
  searchToggle.className = 'search-toggle nav-icon';
  searchToggle.setAttribute('aria-label', '搜索');
  // SVG 图标
  searchToggle.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

  const searchWrap = document.createElement('span');
  searchWrap.className = 'search-wrap';

  const searchBox = document.createElement('input');
  searchBox.type = 'text';
  searchBox.className = 'search-box';
  searchBox.placeholder = '搜索文章...';
  searchBox.setAttribute('aria-label', '搜索文章');

  searchWrap.appendChild(searchBox);

  if (writeBtn) {
    navActions.insertBefore(searchWrap, writeBtn);
    navActions.insertBefore(searchToggle, searchWrap);
  } else {
    navActions.appendChild(searchToggle);
    navActions.appendChild(searchWrap);
  }

  let searchVisible = false;

  searchToggle.addEventListener('click', () => {
    searchVisible = !searchVisible;
    searchBox.classList.toggle('visible', searchVisible);
    if (searchVisible) {
      setTimeout(() => searchBox.focus(), 250); // 等动画完成后聚焦
    } else {
      searchBox.value = '';
      currentSearchQuery = '';
      renderPosts();
    }
  });

  // 实时搜索
  let searchDebounce = null;
  searchBox.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      currentSearchQuery = searchBox.value.trim();
      renderPosts();
    }, 200);
  });

  // Escape 关闭搜索
  searchBox.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchBox.value = '';
      searchBox.classList.remove('visible');
      searchVisible = false;
      currentSearchQuery = '';
      renderPosts();
    }
  });
}

// ============================================================
// 新增功能3：回到顶部按钮 + 新增功能4：滚动进度条
// 原理：scroll 监听，scrollY > 500 显示按钮，进度条 scaleX 联动
// ============================================================
function initScrollFeatures() {
  // 回到顶部按钮
  const btn = document.createElement('button');
  btn.className = 'back-to-top';
  btn.setAttribute('aria-label', '回到顶部');
  // SVG 箭头图标
  btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" style="fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`;
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.body.appendChild(btn);

  // 滚动进度条
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  document.body.appendChild(progress);

  // 共用 scroll 监听
  let progressTimer = null;
  window.addEventListener('scroll', () => {
    if (!progressTimer) {
      progressTimer = requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const percent = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;

        btn.classList.toggle('visible', scrollTop > 500);
        progress.style.transform = 'scaleX(' + percent + ')';

        progressTimer = null;
      });
    }
  }, { passive: true });
}

// ============================================================
// 新增背景装饰2：右上角芯片（动态创建 DOM 元素）
// ============================================================
function initChipDeco() {
  const chip = document.createElement('div');
  chip.className = 'chip-deco';
  chip.setAttribute('aria-hidden', 'true');
  document.body.appendChild(chip);
}

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', async function () {
  loadTheme();

  // 尝试从服务端 API 加载数据
  const useServer = await apiAvailable();
  if (useServer) {
    try {
      const serverPosts = await apiGetPosts();
      savePosts(serverPosts);  // 同步到 localStorage 作为缓存
      const serverProfile = await apiGetProfile();
      saveProfile(serverProfile);
    } catch (e) {
      console.log('API 加载失败，使用本地数据');
    }
  } else {
    initSampleData();
  }

  // 管理员 UI：显示后台按钮/写文章、隐藏访客管理入口
  if (isAdmin()) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
    const btnAdmin = document.getElementById('btnAdmin');
    if (btnAdmin) btnAdmin.style.display = 'none';
  } else {
    // 访客：隐藏后台相关按钮
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
  }

  renderAll();

  initNavScroll();
  initRipple();
  initCodeRain();
  initInkParticles();
  initCardTilt();

  // 新增功能1：搜索
  initSearch();

  // 新增功能3+4：回到顶部 + 滚动进度条
  initScrollFeatures();

  // 新增 UI 改进6：SVG 图标
  initNavIcons();

  // 新增背景装饰2：右上角芯片 CSS 元素
  initChipDeco();

  // 标签云事件委托
  document.getElementById('tagCloud')?.addEventListener('click', function (e) {
    const badge = e.target.closest('.tag-badge');
    if (badge) filterByTag(badge.dataset.tag);
  });

  // Modal 关闭
  document.getElementById('postModal')?.addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });

  // 设置弹窗关闭
  document.getElementById('settingsOverlay')?.addEventListener('click', function (e) {
    if (e.target === this) closeSettings();
  });

  // Escape 键关闭弹窗
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeModal(); cancelDelete(); closeSettings(); closeProfileDetail(); }
  });

  // 个人信息详情弹窗点击外部关闭
  document.getElementById('profileDetailModal')?.addEventListener('click', function (e) {
    if (e.target === this) closeProfileDetail();
  });
});
