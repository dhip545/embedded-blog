# 嵌入式学习笔记

水墨风格的个人技术博客，专为嵌入式开发学习记录而设计。纯 Python 标准库 + 原生前端，零外部依赖即可运行。

## 在线演示

[https://embedded-blog-production.up.railway.app](https://embedded-blog-production.up.railway.app)

## 功能

### 博客

- **Markdown 编辑器** — 实时预览，Ctrl+S 快速保存
- **代码高亮** — highlight.js，带行号、语言标签、一键复制，支持亮/暗两套主题
- **数学公式** — KaTeX 渲染，支持 `$...$` 行内和 `$$...$$` 块级公式
- **图片灯箱** — 点击文章内图片放大查看
- **文章点赞** — 访客可互动
- **分享链接** — 一键复制文章 URL
- **分类 / 标签筛选** — 侧边栏分类导航 + 标签云权重展示
- **全文搜索** — 标题 + 正文实时检索，关键词高亮
- **归档时间轴** — 按年月归档
- **阅读时长** — 自动估算每篇文章阅读时间
- **上一篇 / 下一篇** — 文章详情页底部导航
- **TOC 目录** — 自动生成文章内 h1-h3 目录
- **RSS 订阅** — `/feed.xml` Atom 格式

### 后台管理

- **访问统计** — 总访问量、今日访问、独立访客、浏览器/系统分布
- **访问记录** — IP、页面、浏览器、操作系统、时间
- **文章管理** — 新建、编辑、删除
- **个人信息** — 昵称、简介、头像（支持本地上传和 URL）、GitHub、邮箱、B站

### 视觉设计

- 水墨黑白 Swiss Editorial 风格
- 代码雨 Canvas 动态背景
- 墨水粒子漂浮效果
- CPU 芯片纯 CSS 装饰
- 玻璃态卡片 + 毛玻璃导航栏
- 暗色模式
- 骨架屏加载态
- 卡片入场动画
- 平滑主题切换过渡

### 技术特性

- **PWA** — Service Worker 离线缓存，可添加到手机主屏幕
- **双模数据** — 服务端 JSON 文件 + 浏览器 localStorage，离线也能用
- **打印样式** — `@media print` 隐藏装饰，输出干净文章
- **响应式** — 适配手机 / 平板 / 桌面
- **无障碍** — aria-label、focus-visible、prefers-reduced-motion

## 快速开始

```bash
# 1. 克隆
git clone https://github.com/dhip545/embedded-blog.git
cd embedded-blog

# 2. 启动（无需 pip install）
python server.py

# 3. 浏览器打开
# 访客: http://localhost:8080
# 管理: http://localhost:8080/admin.html
```

默认管理密码: `admin123`  
修改方式: 设置环境变量 `BLOG_ADMIN_PASSWORD` 或直接改 `server.py`

## 项目结构

```
├── index.html           # 首页
├── editor.html          # 写文章
├── admin.html           # 登录
├── dashboard.html       # 后台统计
├── server.py            # API 服务器（纯标准库）
├── sw.js                # Service Worker
├── manifest.json        # PWA 清单
├── Procfile             # Railway / Heroku 部署
├── css/
│   └── style.css        # 全局样式（水墨黑白 + 暗色模式）
├── js/
│   └── app.js           # 核心逻辑
├── lib/                 # 本地化依赖（CDN 已下载到本地）
│   ├── marked.min.js
│   ├── highlight.min.js + CSS
│   └── katex.min.js + CSS
└── data/
    ├── posts.json       # 文章数据
    ├── profile.json     # 个人信息
    └── visits.json      # 访问记录
```

## API 接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|:----:|
| GET | `/api/posts` | 获取文章列表 | — |
| POST | `/api/posts` | 创建文章 | Bearer |
| PUT | `/api/posts/:id` | 更新文章 | Bearer |
| DELETE | `/api/posts/:id` | 删除文章 | Bearer |
| GET | `/api/profile` | 获取个人信息 | — |
| PUT | `/api/profile` | 更新个人信息 | Bearer |
| POST | `/api/admin` | 管理员登录 | — |
| GET | `/api/stats` | 访问统计 | Bearer |
| GET | `/api/visits` | 访问记录 | Bearer |
| GET | `/feed.xml` | RSS 订阅 | — |

## 部署

### Railway / Heroku

```bash
# Procfile 已配置
web: python server.py
```

环境变量:

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `8080` | 监听端口 |
| `BLOG_ADMIN_PASSWORD` | `admin123` | 管理密码 |

### 纯静态托管

无需后端也能运行（数据存浏览器 localStorage）：

1. 删除或忽略 `server.py`、`Procfile`
2. 将所有文件部署到任意静态托管（GitHub Pages、Vercel、Netlify）
3. 管理功能（写文章、编辑）通过 localStorage 独立运作

## 技术栈

- **后端**: Python 3 标准库（`http.server`）
- **前端**: 原生 HTML / CSS / JavaScript
- **Markdown**: marked.js
- **代码高亮**: highlight.js
- **数学公式**: KaTeX
- **字体**: Noto Serif SC / Noto Sans SC（Google Fonts）
- **图标**: 内联 Lucide SVG
