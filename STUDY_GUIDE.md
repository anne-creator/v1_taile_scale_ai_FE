# 前端 AI 协作开发学习指南

本指南专为新手开发者设计，帮助你快速上手使用 AI 进行前端开发。

**学习策略：Bottom-up + Top-down 结合**

- **Bottom-up**：先掌握基础概念，再阅读代码
- **Top-down**：项目代码库已严格遵循架构原则，组件可直接使用

---

## 第一部分：必须掌握的基础概念

### 1.1 技术栈清单

开始之前，确保你对以下技术有基本了解：

| 技术 | 学习重点 | 推荐资源 |
|-----|---------|---------|
| React 18+ | Hooks、组件生命周期、状态管理 | React 官方文档 |
| Next.js App Router | Server Components、路由、布局 | Next.js 官方文档 |
| TypeScript | 类型定义、接口、泛型基础 | TypeScript Handbook |
| Tailwind CSS | 实用类、响应式设计、自定义配置 | Tailwind 官方文档 |

> **提示**：不需要精通每一项，但需要能够阅读和理解代码。

---

### 1.2 如何使用 Gemini 引导学习模式

Gemini 提供了一种「引导学习模式」，可以帮助你系统性地学习新概念。这是一个非常有效的自学工具。

**什么是引导学习模式？**

Gemini 的引导学习模式是一种交互式学习方式。它不会直接给你答案，而是通过提问和提示，引导你自己思考和发现答案。这种方式更有助于深度理解和长期记忆。

**如何开启引导学习模式？**

1. 打开 Gemini 网页应用 (gemini.google.com)
2. 在对话开始时，告诉 Gemini 你想要学习什么
3. 明确要求使用「引导学习模式」或「Socratic method」
4. Gemini 会通过一系列问题引导你学习

**学习新概念的最佳实践步骤：**

1. **明确学习目标**
   - 告诉 Gemini 你想学习什么概念
   - 说明你的当前水平和背景知识

2. **请求引导式学习**
   - 示例提示词：「请用引导学习模式教我 [概念名称]。不要直接告诉我答案，而是通过提问引导我理解。」

3. **积极参与回答**
   - 认真思考 Gemini 提出的每个问题
   - 尝试用自己的话回答
   - 不确定时说出你的困惑

4. **请求实践练习**
   - 概念理解后，请求一些小练习
   - 让 Gemini 检查你的代码并给出反馈

**示例：用 Gemini 学习 React Server Components**

```
你：我想学习 React Server Components。请用引导学习模式，通过提问引导我理解这个概念。
    我已经了解基本的 React 组件和 Hooks。

Gemini：好的，让我们开始。首先，你能告诉我，普通的 React 组件（Client Components）
       是在哪里执行的吗？浏览器端还是服务器端？

你：在浏览器端执行。

Gemini：很好！那你觉得，如果一个组件只是用来展示数据，不需要任何交互（比如点击、
       输入），它真的需要在浏览器端执行吗？这样做有什么潜在的问题？

你：（思考后回答...）

[继续引导学习...]
```

**适合用引导学习模式学习的概念：**

- React Server Components vs Client Components
- Next.js App Router 的工作原理
- TypeScript 类型推断
- Tailwind CSS 的设计理念
- 本项目的 L0-L5 架构（下一部分详细介绍）

---

## 第二部分：UI 层级管理（核心学习内容）

**这是本指南最重要的部分。**

掌握这套架构是你能够有效与 AI 协作开发的关键。当你理解了每一层的职责和边界，你就能：
- 准确地告诉 AI 你需要什么层级的组件
- 快速判断 AI 生成的代码是否符合架构规范
- 避免常见的架构错误

> **参考文档**：[code_principle.md](./code_principle.md) 包含完整的架构规范

---

### 2.1 L0-L5 架构概览

项目采用分层架构，从底层到顶层共 6 个层级：

```
L5 Pages          ← 纯组装，不写样式
    ↑
L4 Blocks         ← 页面区块，编排子组件
    ↑
L3 Custom         ← 品牌设计语言
    ↑
L2.5 Compound     ← 多元素交互状态
    ↑
L2 Animation      ← 动画效果装饰
    ↑
L1 Base           ← shadcn/ui 基础组件
    ↑
L0 Tokens         ← 设计系统基础值
```

**每层的核心职责：**

| 层级 | 名称 | 职责 | 对应目录 |
|-----|------|------|---------|
| L0 | Design Tokens | 定义颜色、间距、字体、动画时长等「魔法数字」 | `styles/`, `tailwind.config.js` |
| L1 | Base Primitives | shadcn/ui 的底层组件，只负责视觉样式 | `components/ui/` |
| L2 | Animation Wrappers | 可复用的动画效果，包裹任何元素即可生效 | `components/animations/` |
| L2.5 | Compound Components | 管理多元素的交互状态（如 Tabs、Accordion） | `components/compound/` |
| L3 | Custom Components | 应用品牌设计语言的定制组件 | `components/custom/` |
| L4 | Blocks | 页面的主要构成区块，编排子组件的动画时机 | `components/blocks/` |
| L5 | Pages | 纯组装层，只负责堆叠 Blocks 和数据获取 | `app/` |

---

### 2.2 每层的关键规则

以下是每层必须遵守的规则，违反这些规则会破坏架构的一致性。

**L0 Design Tokens**

- 所有「魔法数字」必须在这里定义
- 组件中只能引用 token，不能硬编码颜色、间距等值

```css
/* 正确：在 globals.css 定义 token */
:root {
  --section-gap-md: 5rem;
}

/* 错误：在组件中硬编码 */
.section { margin-bottom: 80px; }  /* ❌ */
```

**L1 Base Primitives**

- 只修改视觉样式以匹配 Design Tokens
- 不添加任何业务逻辑
- Icon-only buttons 必须有 `aria-label`
- 交互元素必须有 `focus-visible` 样式

```tsx
// 正确
<button aria-label="删除" className="focus-visible:ring-2">
  <TrashIcon aria-hidden="true" />
</button>

// 错误
<div onClick={handleClick}><TrashIcon /></div>  // ❌
```

**L2 Animation Wrappers**

- 必须接受 `children` 并应用效果
- 必须支持 `prefers-reduced-motion`
- 只动画 `transform` 和 `opacity`
- 禁止使用 `transition: all`

```tsx
// 正确
<motion.div style={{ transition: 'transform 0.3s, opacity 0.3s' }} />

// 错误
<motion.div style={{ transition: 'all 0.3s' }} />  // ❌
```

**L2.5 Compound Components**

- 只管理 UI 状态（isOpen, activeTab 等）
- **不能** fetch 数据
- **不能** 包含业务逻辑

**L3 Custom Components**

- 可以组合 L1、L2、L2.5 的组件
- 负责应用品牌设计语言

**L4 Blocks**

- 是唯一负责编排 staggered animations 的层级
- 处理自己的布局和 section 内间距
- Block 作为「指挥官」，控制子组件的进场时机

```tsx
// Block 中使用 staggerChildren 编排动画
<motion.div variants={{ visible: { staggerChildren: 0.1 } }}>
  {items.map(item => <Card key={item.id} />)}
</motion.div>
```

**L5 Pages**

- **绝对不写** `className` 或 inline styles
- 只负责组装 Blocks 和 SectionSpacer
- 只负责数据获取（Server Components）

```tsx
// 正确的 Page 写法
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <SectionSpacer size="xl" />
      <FeatureList items={features} />
      <SectionSpacer size="md" />
      <Footer />
    </>
  )
}

// 错误：Page 中写样式
export default function HomePage() {
  return (
    <div className="pt-20 pb-10">  {/* ❌ */}
      <HeroSection />
    </div>
  )
}
```

---

### 2.3 状态管理分层

状态不是全部放在 Page 层，而是根据作用范围分为三层：

| 状态层 | 定义位置 | 适用场景 | 示例 |
|-------|---------|---------|------|
| **Global** | `layout.tsx` + `providers/` | 跨页面共享 | Theme, Auth, Cart |
| **Page** | `page.tsx` | 当前页面专属 | 表单数据, 页面 filter |
| **Component** | L2.5 Compound 内部 | 组件内部 UI 状态 | Accordion 展开, Modal 打开 |

**Context 接口规范（来自 Vercel Composition Patterns）**

所有 Provider 必须使用 `{ state, actions }` 接口：

```tsx
// providers/theme-provider.tsx
const ThemeContext = createContext<{
  state: { theme: 'light' | 'dark' }
  actions: { toggle: () => void }
} | null>(null)
```

---

### 2.4 CONSUME vs MANAGE 的区别

这是理解状态管理的关键概念。

| 操作 | 含义 | 允许的层级 |
|-----|------|----------|
| **CONSUME** | 读取 context，调用 `actions.xxx()` | L1 - L4 都可以 |
| **MANAGE** | 定义状态逻辑，写 `useState`, `useReducer` | 只有 Layout/Page/L2.5 |

**示例：Block 中使用全局状态**

```tsx
// components/blocks/header.tsx (L4 Block)
'use client'
export function Header() {
  const { state, actions } = useTheme()  // ✅ CONSUME - 只读取和调用
  
  return (
    <header>
      <button onClick={actions.toggle}>  {/* 调用 action，不定义逻辑 */}
        {state.theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </header>
  )
}

// 错误：在 Block 中定义状态
function Header() {
  const [theme, setTheme] = useState('dark')  // ❌ MANAGE - Block 不应该做
}
```

---

### 2.5 架构检查清单

在提交代码前，对照此清单检查：

**架构层面：**
- [ ] 组件放在了正确的层级目录
- [ ] 没有跨层级引用（如 Page 直接用 Base Primitive）
- [ ] 动画在正确的层级处理
- [ ] 所有魔法数字都替换为 Design Tokens

**无障碍层面：**
- [ ] Icon-only buttons 有 `aria-label`
- [ ] 表单输入有关联的 `<label>`
- [ ] 交互元素有 `focus-visible` 样式
- [ ] 使用语义化 HTML

**动画层面：**
- [ ] 动画支持 `prefers-reduced-motion`
- [ ] 只动画 `transform` 和 `opacity`
- [ ] 没有使用 `transition: all`

---

## 第三部分：未来学习内容（暂时跳过）

以下内容已在项目中配置好，你目前不需要深入学习。当项目更成熟、你需要进行性能优化时再回来学习。

### 来自 vercel-react-best-practices（P2 优先级）

| 规则 | 说明 | 何时学习 |
|-----|------|---------|
| `bundle-barrel-imports` | 避免 barrel 文件，直接 import | 当 bundle 体积成为问题时 |
| `bundle-dynamic-imports` | 使用 next/dynamic 延迟加载 | 当首屏加载慢时 |
| `server-cache-lru` | LRU 缓存跨请求数据 | 当有高流量场景时 |
| `server-cache-react` | React.cache() 同一请求去重 | 当有复杂数据获取时 |

### 来自 vercel-composition-patterns（高级模式）

| 规则 | 说明 | 何时学习 |
|-----|------|---------|
| `architecture-compound-components` | 复杂组件的 Context 结构 | 当需要构建组件库时 |
| `patterns-explicit-variants` | 显式变体组件 | 当组件 boolean props 过多时 |

**为什么跳过？**

`code_principle.md` 已将这些归类为 P2（项目成熟后考虑）。项目框架已为你处理好基础优化，你可以专注于业务开发。

---

## 第四部分：即用型组件和功能

项目提供了大量预构建的组件和业务功能，你可以直接使用，无需从零开始。

---

### 4.1 预构建 UI 组件清单

**L1 Base Primitives** (`components/ui/`)

```
Button, Input, Textarea, Card, Badge, Avatar, Label, 
Checkbox, Switch, Progress, Skeleton, Table, Form...
```

**L2 Animation Wrappers** (`components/animations/`)

```
BorderBeam, Particles, TextShimmer, Meteors, 
Ripple, RetroGrid, AvatarCircles...
```

**L2.5 Compound Components** (`components/compound/`)

```
Accordion, Tabs, Dialog, Sheet, Drawer, 
DropdownMenu, Tooltip, HoverCard, Command...
```

**L3 Custom Components** (`components/custom/`)

```
ThemeToggler, Pagination, SectionHeader, SectionSpacer,
MarkdownContent, MarkdownEditor, LocaleSelector,
BrandLogo, Copyright, Empty, ErrorBoundary...
```

**L3 AI Components** (`components/custom/ai/`)

```
Message, Response, Reasoning, Sources, Suggestion,
PromptInput, ModelSelector, Conversation...
```

---

### 4.2 预构建业务功能

以下业务功能已完整实现，你可以直接使用：

| 功能 | 类型 | 位置 | 说明 |
|-----|------|------|------|
| **Auth** | Provider | `providers/auth-provider.tsx` | 登录、登出、用户信息管理 |
| **Theme** | Provider | `providers/theme-provider.tsx` | 主题切换（深色/浅色） |
| **Payment** | Block | `components/blocks/payment/` | 支付弹窗、支付提供商 |
| **Chat** | Block | `components/blocks/chat/` | AI 对话界面完整实现 |
| **Dashboard** | Block | `components/blocks/dashboard/` | 后台管理布局 |
| **Landing** | Block | `components/blocks/landing/` | 落地页各种区块 |
| **Auth UI** | Block | `components/blocks/auth/` | 登录、注册、验证表单 |
| **Form** | Block | `components/blocks/form/` | 表单组件封装 |
| **Table** | Block | `components/blocks/table/` | 数据表格封装 |

---

### 4.3 如何使用预构建功能

**使用 Provider（全局状态）**

Provider 已在 `app/layout.tsx` 中配置，你只需在组件中 CONSUME：

```tsx
// 在任何组件中使用 Auth
'use client'
import { useAuth } from '@/providers/auth-provider'

export function UserMenu() {
  const { state, actions } = useAuthContext()
  
  if (!state.user) {
    return <button onClick={() => actions.login(email, password)}>登录</button>
  }
  
  return (
    <div>
      <span>{state.user.name}</span>
      <button onClick={() => actions.logout()}>登出</button>
    </div>
  )
}
```

**使用 Blocks（页面区块）**

在 Page 中直接组装 Blocks：

```tsx
// app/[locale]/(landing)/page.tsx
import { HeroSection, Features, Pricing, Footer } from '@/components/blocks/landing'
import { SectionSpacer } from '@/components/custom'

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <SectionSpacer size="lg" />
      <Features />
      <SectionSpacer size="md" />
      <Pricing />
      <Footer />
    </>
  )
}
```

**使用 Chat Block（完整 AI 对话）**

```tsx
import { ChatBox, ChatInput, ChatMessages } from '@/components/blocks/chat'

export default function ChatPage() {
  return (
    <ChatBox>
      <ChatMessages />
      <ChatInput />
    </ChatBox>
  )
}
```

---

### 4.4 文件夹结构参考

```
src/
├── app/                          # L5 Pages
│   └── [locale]/
│       ├── (landing)/           # 落地页路由组
│       ├── (auth)/              # 认证页路由组
│       ├── (chat)/              # 聊天页路由组
│       └── (admin)/             # 后台管理路由组
│
├── components/
│   ├── ui/                      # L1 Base Primitives
│   ├── animations/              # L2 Animation Wrappers
│   ├── compound/                # L2.5 Compound Components
│   ├── custom/                  # L3 Custom Components
│   └── blocks/                  # L4 Blocks
│       ├── auth/
│       ├── chat/
│       ├── dashboard/
│       ├── landing/
│       ├── payment/
│       └── ...
│
├── providers/                   # Global State Providers
│   ├── auth-provider.tsx
│   ├── theme-provider.tsx
│   └── index.ts
│
├── config/
│   └── style/
│       ├── global.css          # L0 Design Tokens
│       └── theme.css
│
└── shared/
    ├── hooks/                   # 可复用 Hooks
    ├── lib/                     # 工具函数
    └── models/                  # 数据模型
```

---

## 关键参考来源

- **主要参考**: [code_principle.md](./code_principle.md) - 完整架构规范
- **Vercel Skills**（code_principle.md 中 P0/P1 引用的部分）:
  - Context `{ state, actions }` 接口 → Composition Patterns 2.2
  - Provider 状态提升 → Composition Patterns 2.3
  - `Promise.all()` 并行请求 → React Best Practices 1.4
  - Suspense Boundaries → React Best Practices 1.5

---

## 学习路径建议

1. **第一周**：学习第一部分的技术栈基础，使用 Gemini 引导学习模式
2. **第二周**：深入学习第二部分的 L0-L5 架构，对照代码理解每层职责
3. **第三周起**：开始使用第四部分的预构建组件进行开发
4. **项目成熟后**：回来学习第三部分的高级优化技巧
