# TaleCraft Design Guide

## Overview

本项目严格遵循 `code_principle.md` 中定义的分层架构，确保 UI 样式的集中管理和一致性。

---

## Level 0: Design Tokens

所有 UI 基元（颜色、字体、间距、阴影、动画）集中定义在 CSS 变量中。

### 文件位置
- `src/config/style/theme.css` - 核心 tokens 定义
- `src/config/style/global.css` - Tailwind 工具类

### Color System

#### Semantic Colors (自动适配 Light/Dark)

| Token | Light Mode | Dark Mode | 用途 |
|-------|------------|-----------|------|
| `--background` | oklch(0.98...) | oklch(0.27...) | 页面背景 |
| `--foreground` | oklch(0.34...) | oklch(0.81...) | 文本颜色 |
| `--primary` | oklch(0.62...) | oklch(0.67...) | 主要操作 (Orange) |
| `--primary-hover` | oklch(0.56...) | oklch(0.61...) | 主要操作悬停 |
| `--secondary` | oklch(0.92...) | oklch(0.98...) | 次要操作 |
| `--muted` | oklch(0.93...) | oklch(0.22...) | 静音背景 |
| `--accent` | oklch(0.92...) | oklch(0.21...) | 强调色 |
| `--destructive` | oklch(0.19...) | oklch(0.64...) | 危险操作 |
| `--border` | oklch(0.88...) | oklch(0.36...) | 边框 |
| `--input` | oklch(0.76...) | oklch(0.43...) | 输入框 |
| `--ring` | oklch(0.62...) | oklch(0.67...) | 焦点环 |

#### Brand Colors (Dark Tones)

| Token | 值 | Tailwind Class | 用途 |
|-------|-----|----------------|------|
| `--brand-dark` | oklch(0.15 0.02 280) | `bg-brand-dark` | 深色品牌色 |
| `--brand-dark-soft` | oklch(0.22 0.01 260) | `bg-brand-dark-soft` | 柔和深色 |
| `--brand-loader` | oklch(0.55 0.20 275) | - | 加载器颜色 |

#### Chart Colors

| Token | Tailwind Class |
|-------|----------------|
| `--chart-1` | `bg-chart-1`, `fill-chart-1` |
| `--chart-2` | `bg-chart-2`, `fill-chart-2` |
| `--chart-3` | `bg-chart-3`, `fill-chart-3` |
| `--chart-4` | `bg-chart-4`, `fill-chart-4` |
| `--chart-5` | `bg-chart-5`, `fill-chart-5` |

---

### Typography System

#### Font Sizes (响应式)

| Token | 值 | Tailwind Class | 使用场景 |
|-------|-----|----------------|----------|
| `--font-size-h1` | clamp(2rem, 5vw, 3rem) | `text-h1` | 页面主标题 |
| `--font-size-h2` | clamp(1.5rem, 4vw, 2.25rem) | `text-h2` | Section 标题 |
| `--font-size-h3` | clamp(1.25rem, 3vw, 1.5rem) | `text-h3` | 子标题 |
| `--font-size-h4` | clamp(1rem, 2vw, 1.25rem) | `text-h4` | 小标题 |

#### Line Heights

| Token | 值 | Tailwind Class |
|-------|-----|----------------|
| `--line-height-tight` | 1.2 | `leading-tight` |
| `--line-height-normal` | 1.5 | `leading-normal` |
| `--line-height-relaxed` | 1.75 | `leading-relaxed` |

#### Font Weights

| Token | 值 | Tailwind Class |
|-------|-----|----------------|
| `--font-weight-normal` | 400 | `font-normal` |
| `--font-weight-medium` | 500 | `font-medium` |
| `--font-weight-semibold` | 600 | `font-semibold` |
| `--font-weight-bold` | 700 | `font-bold` |

---

### Spacing System

#### Section Spacing

| Token | 值 | Tailwind Class | 使用场景 |
|-------|-----|----------------|----------|
| `--section-gap-sm` | 3rem (48px) | `py-section-sm` | Footer, 小间距 |
| `--section-gap-md` | 5rem (80px) | `py-section-md` | 标准 Section |
| `--section-gap-lg` | 8rem (128px) | `py-section-lg` | 大型 Section |
| `--section-gap-xl` | 12rem (192px) | `py-section-xl` | 特大 Section |

**使用示例:**
```tsx
<section className="py-section-md">
  {/* Section content */}
</section>
```

---

### Animation System

#### Durations

| Token | 值 | 用途 |
|-------|-----|------|
| `--duration-fast` | 150ms | 快速反馈 |
| `--duration-normal` | 300ms | 标准过渡 |
| `--duration-slow` | 500ms | 缓慢过渡 |
| `--duration-slower` | 700ms | 强调动画 |

#### Easing Functions

| Token | 值 | 用途 |
|-------|-----|------|
| `--ease-in` | cubic-bezier(0.4, 0, 1, 1) | 加速 |
| `--ease-out` | cubic-bezier(0, 0, 0.2, 1) | 减速 |
| `--ease-in-out` | cubic-bezier(0.4, 0, 0.2, 1) | 平滑 |
| `--ease-spring` | cubic-bezier(0.34, 1.56, 0.64, 1) | 弹性 |

---

### Shadow System

| Token | Tailwind Class | 用途 |
|-------|----------------|------|
| `--shadow-2xs` | `shadow-2xs` | 最小阴影 |
| `--shadow-xs` | `shadow-xs` | 极小阴影 |
| `--shadow-sm` | `shadow-sm` | 小阴影 |
| `--shadow` | `shadow` | 标准阴影 |
| `--shadow-md` | `shadow-md` | 中等阴影 |
| `--shadow-lg` | `shadow-lg` | 大阴影 |
| `--shadow-xl` | `shadow-xl` | 特大阴影 |
| `--shadow-2xl` | `shadow-2xl` | 最大阴影 |

---

### Border Radius System

| Token | Tailwind Class |
|-------|----------------|
| `--radius-sm` | `rounded-sm` |
| `--radius-md` | `rounded-md` |
| `--radius-lg` | `rounded-lg` |
| `--radius-xl` | `rounded-xl` |

---

## Level 1: Base Primitives (shadcn/ui)

位置: `src/components/ui/`

这些是基础 UI 组件，直接使用 Level 0 tokens。

### Button Variants

| Variant | 样式 | 使用场景 |
|---------|------|----------|
| `default` | `bg-primary text-primary-foreground` | 主要操作 (Orange) |
| `destructive` | `bg-destructive text-white` | 危险操作 |
| `outline` | `border bg-background` | 次要操作 |
| `secondary` | `bg-secondary text-secondary-foreground` | 辅助操作 |
| `ghost` | `hover:bg-accent` | 不显眼操作 |
| `link` | `text-primary underline` | 链接样式 |

**使用示例:**
```tsx
<Button variant="default">Subscribe Now</Button>
<Button variant="outline">Cancel</Button>
<Button variant="secondary">Learn More</Button>
```

---

## Level 2: Animation Wrappers

位置: `src/components/animations/`

动画包装组件，接受 `children` 并应用动画效果。

| 组件 | 用途 | 默认颜色 |
|------|------|----------|
| `BorderBeam` | 边框光束效果 | `var(--primary)` |
| `Particles` | 粒子效果 | `var(--foreground)` |
| `Meteors` | 流星效果 | `foreground/50` |
| `Ripple` | 涟漪效果 | 使用 semantic tokens |
| `RetroGrid` | 复古网格背景 | 使用 semantic tokens |

---

## Level 2.5: Compound Components

位置: `src/components/compound/`

组合型组件，封装交互逻辑。

| 组件 | 职责 |
|------|------|
| `ThemeToggle` | 主题切换 (light/dark) |
| `Select` | 下拉选择器 |
| `Tabs` | 标签页切换 |
| `Accordion` | 手风琴折叠 |
| `Sheet` | 侧边抽屉 |

---

## Level 3: Custom Components

位置: `src/components/custom/`

业务相关但可复用的组件。

| 组件 | 职责 |
|------|------|
| `BrandLogo` | Logo 展示 |
| `LazyImage` | 懒加载图片 |
| `Pagination` | 分页控件 |
| `Empty` | 空状态展示 |
| `SmartIcon` | 智能图标 |

---

## Level 4: Blocks

位置: `src/components/blocks/`

页面构建块，组合底层组件。

### Landing Blocks
- `Hero` - 首页英雄区
- `Features*` - 特性展示 (Flow, Accordion, List, Step, Media)
- `Pricing` - 定价展示
- `FAQ` - 常见问题
- `CTA` - 行动召唤
- `Testimonials` - 用户评价
- `Footer` - 页脚

### Generator Blocks
- `ImageGenerator` - 图片生成器
- `VideoGenerator` - 视频生成器
- `MusicGenerator` - 音乐生成器

### Console Blocks
- `ConsoleLayout` - 控制台布局

---

## Level 5: Pages

位置: `src/app/`

页面只负责数据获取和组装 Blocks，**不应包含样式类**。

**正确做法:**
```tsx
export default function Page() {
  return (
    <>
      <Hero section={heroData} />
      <Features section={featuresData} />
    </>
  );
}
```

**错误做法:**
```tsx
// ❌ 页面不应有 className
export default function Page() {
  return (
    <div className="py-16 bg-muted">
      <Hero section={heroData} />
    </div>
  );
}
```

---

## Quick Reference

### 常用 Token 速查

```css
/* 颜色 */
bg-background bg-foreground bg-primary bg-secondary bg-muted bg-accent
bg-brand-dark bg-brand-dark-soft

/* 文字 */
text-foreground text-muted-foreground text-primary text-primary-foreground

/* 间距 */
py-section-sm py-section-md py-section-lg py-section-xl

/* 字体 */
text-h1 text-h2 text-h3 text-h4

/* 按钮 */
<Button variant="default|destructive|outline|secondary|ghost|link" />
```

### 修改指南

1. **修改主色**: 编辑 `theme.css` 中的 `--primary` 和 `--primary-hover` 变量
2. **修改间距**: 编辑 `theme.css` 中的 `--section-gap-*` 变量
3. **修改字体大小**: 编辑 `theme.css` 中的 `--font-size-*` 变量
4. **添加按钮变体**: 编辑 `button.tsx` 中的 `buttonVariants`
5. **修改 Light/Dark 主题**: 编辑 `theme.css` 中的 `:root` 和 `.dark` 块

---

## 合规检查清单

- [ ] 所有颜色使用 semantic tokens 或 brand tokens
- [ ] 所有 section 间距使用 `py-section-*`
- [ ] 所有标题使用 `text-h1` ~ `text-h4`
- [ ] Pages 不包含样式类
- [ ] Layouts 只使用 token 类
- [ ] Blocks 不管理 state（无 useState）
- [ ] Animations 使用 CSS 变量作为默认值
