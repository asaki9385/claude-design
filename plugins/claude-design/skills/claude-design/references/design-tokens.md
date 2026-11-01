# CDS 设计令牌（Design Tokens）

> 唯一可信来源是 `references/upstream/code-examples/cds-theme.css`（v2，含暗色覆盖）与 `references/upstream/code-examples/tailwind.config.js`。
> 上游仓库根本的 `AGENTS.md`（本技能内为 `references/upstream/AGENTS.md`）令牌表是 **v1 口径，已过期**：它写 surface-0 = `#fcfcfb`，而 CSS 实际是 `#f9f9f7`。以 CSS 为准。

---

## 1. 表面阶梯（Surface Ladder）

四层微明度差异 + 一个浮层。整页层次**只靠这五级 + 发丝边框**建立，不靠大投影。

| Token | 浅色 | 暗色 | 用途（按 CSS 注释口径） |
| :-- | :-- | :-- | :-- |
| `--cds-surface-0` | `#f9f9f7` (gray-20) | `#0b0b0b` (gray-900) | 侧边栏 / 底层 Canvas 基底 |
| `--cds-surface-1` | `#fcfcfb` (gray-10) | `#151515` (gray-850) | 页面主聊天画布背景 |
| `--cds-surface-2` | `#ffffff` (gray-0) | `#1a1a19` (gray-830) | 消息卡片表面 |
| `--cds-surface-3` | `#ffffff` (gray-0) | `#20201f` (gray-800) | 输入框容器 / 高层浮层、hover 与选中态 |
| `--cds-surface-popover` | `#ffffff` | `#2c2c2a` (gray-750) | 浮层、下拉菜单 |

Tailwind 用法：`bg-surface-0` … `bg-surface-3`、`bg-surface-popover`。
注意浅色下 surface-2 与 surface-3 同为纯白，靠 **边框/阴影** 而不是填充区分；暗色才靠填充区分。
层级顺序是"侧栏(0) → 画布(1) → 卡片(2) → 浮层(3)"，不是简单的数字越大越亮。

## 2. 文字

| Token | 浅色 | 暗色 | 用途 |
| :-- | :-- | :-- | :-- |
| `--cds-text-primary` | `#151515` | `#f5f5f5` | 正文、标题、激活标签 |
| `--cds-text-secondary` | `#525252` | `#a3a3a3` | 时间戳、副标题、次级操作 |
| `--cds-text-muted` | `#8a8a8a` | `#666666` | 占位符、禁用、快捷键提示 |

## 3. 边框与透明度阶梯

所有边框都是"半透明黑/白"，**不写死灰色 HEX**，这样同一套边框能跨 surface 自适应。

| Token | 浅色 | 暗色 |
| :-- | :-- | :-- |
| `--cds-alpha-1` | `hsla(0,0%,8%,.05)` | `hsla(0,0%,100%,.05)` |
| `--cds-alpha-2` = `--cds-border` | `hsla(0,0%,8%,.10)` | `hsla(0,0%,100%,.09)` |
| `--cds-alpha-3` = `--cds-border-strong` | `hsla(0,0%,8%,.20)` | `hsla(0,0%,100%,.18)` |
| `--cds-alpha-4` | `hsla(0,0%,8%,.35)` | `hsla(0,0%,100%,.30)` |
| `--cds-ring-hairline` | `1px`（1x 屏）；`0.5px`（2dppx）；`calc(1px/3)`（3dppx） | 同左 |

- 描边宽度：`border-hairline` 类 = `var(--cds-ring-hairline)`。高分屏发丝补偿，避免 1px 在 Retina 上过重。
- 暗色模式环向内翻转：`--cds-ring-inner: 1px; --cds-ring-outer: 0`（浅色相反）。阴影写法必须读 token，不要写死 inset。

## 4. 品牌陶土色（Clay）

| Token | 浅色 | 暗色 |
| :-- | :-- | :-- |
| `--cds-clay` / `bg-clay` | `#d97757` | `#d97757` |
| `--cds-clay-hover` / `bg-clay-hover` | `#cc5a36` | `#e08264` |
| `--cds-clay-light`（浅底徽标） | `#fbf3ef` | `rgba(217,119,87,.15)` |
| `--cds-fill-danger` | `#ef4444` | `#f87171` |

Clay 只用于**主操作、品牌标识、状态呼吸点**。禁止把它当作大面积背景或第二强调色；界面的其余部分保持暖中性灰。

## 5. 填充

| Token | 浅色 | 暗色 | 用途 |
| :-- | :-- | :-- | :-- |
| `--cds-fill-secondary` | `hsla(0,0%,8%,.10)` | `hsla(0,0%,100%,.09)` | Secondary 按钮底 |
| `--cds-fill-secondary-hover` | `rgba(21,21,21,.14)` | `rgba(255,255,255,.14)` | 同上 hover |
| `--cds-fill-ghost-hover` | `alpha-1` | `alpha-1` | Ghost 按钮 hover |
| `--cds-fill-ghost-selected` | `alpha-2` | `alpha-2` | Ghost 按钮选中 |
| `--cds-segmented-track` | `rgba(0,0,0,.06)` | `rgba(255,255,255,.08)` | 分段控件轨道 |
| `--cds-segmented-thumb` | `#ffffff` | `#2c2c2a` | 分段控件滑块 |

## 6. 圆角矩阵

组件源码里用的是**字面量 + CSS 变量兜底**两种写法，取值必须落在下表内：

| 半径 | 值 | 用在哪 |
| :-- | :-- | :-- |
| `rounded-pill` | `9999px` | 胶囊按钮、分段控件轨道、模型切换器外壳 |
| `rounded-composer` | `20px` | 主输入框（ChatComposer / RichComposer） |
| `rounded-bubble` | `var(--cds-message-bubble-radius, 18px)` | 用户消息气泡 |
| `rounded-2xl` | `16px` | 对话框、浮层菜单、内置卡片 |
| `rounded-xl` | `12px` | 代码块、大按钮(LG)、附件预览 |
| `rounded-panel` | `10px` | 面板、附件胶囊、工具卡 |
| `rounded-lg` | `8px` | 标准按钮(MD/SM)、分段项 |
| `rounded-md` | `6px` | 紧凑按钮(XS)、快捷键 chip |
| `rounded-card` | `calc(var(--radius-lg,8px) + 4px)` | 文件磁贴（同心圆角：内圆角 = 外圆角 − padding） |

同心圆角规则：**父容器圆角 − 内边距 = 子元素圆角**。磁贴 10px 内衬 4px，内部徽标就该是 6px，不是也写 10px。

## 7. 阴影

阴影全部是"1px 环 + 极低不透明度扩散"，不许出现生硬的 `0 10px 30px rgba(0,0,0,.3)`。

| 类 / 变量 | 语义 |
| :-- | :-- |
| `shadow-sm` / `--cds-shadow-sm` | 卡片默认：`0 1px 2px rgba(0,0,0,.05), 0 2px 8px rgba(0,0,0,.08)` |
| `shadow-lg` | 抬升面板 |
| `shadow-popover` | 浮层：内外双环 + `0 8px 24px rgba(0,0,0,.12)` |
| `shadow-panel` | `0 0 0 1px var(--cds-border)` + shadow-sm |
| `shadow-composer` | 输入框：`0 4px 20px rgba(0,0,0,.035), inset 0 0 0 1px var(--cds-border)` |
| `shadow-composer-focus` | 聚焦加一层外环，**不要**换成 clay 描边 |
| `shadow-focus-glow` / `--cds-focus-shadow` | 焦点环：`inset 0 0 0 1px surface-1, 0 0 0 1.5px clay, 0 0 6px 1px rgba(217,119,87,.25)` |
| `shadow-drop-glow` | 拖拽落点：内侧 clay 2px + 24px 内发光 |

## 8. 字体与排版

```js
// tailwind.config.js 已内置的回退栈
sans:  ['AnthropicSans','Inter','system-ui','-apple-system','BlinkMacSystemFont','Segoe UI','PingFang SC','sans-serif']
serif: ['AnthropicSerif','Newsreader','ui-serif','Georgia','Times New Roman','serif']
mono:  ['JetBrains Mono','ui-monospace','SF Mono','Menlo','monospace']
```

- 正文尺寸：`--chat-body: calc(.875rem * var(--cds-rem-scale))`，`--cds-rem-scale = 16/17`（把官方 17px 基准换算回 16px 基准）。用 `text-sm` 量级即可，不要 13px 以下的正文。
- **动态数字一律 `tabular-nums`**：计时器、倒计时、token 计数、频率、行号。
- 暗色下字重**反向减细**（官方在 Retina 上对暗色模式做字重逆补偿），不要因为"暗底看不清"就整体加粗。
- 行内图标光学对齐：`margin-block: -0.125em`，让图标视觉重心与文字中线齐平。

## 9. 仓库未随附的令牌（兼容层）

组件源码引用了 **17 个本仓库没定义**的变量（`--cds-radius`、`--cds-dur-snap`、`--cds-fill-accent`、`--cds-bg-neutral-hover` 等）和 **11 个没定义的工具类**（`text-heading`、`font-control`、`shadow-field`、`duration-120` …）。其中 5 个变量在源码里**没有 fallback**，不补就会让整条属性失效。

这些已经整理成 `references/compat.css`，与 `cds-theme.css` 一起引入即可：

```tsx
import './styles/cds-theme.css';
import './styles/compat.css';   // 必须在其后
```

`compat.css` 里标了「推导」的值不是上游原值，只是让缺省状态长得对。它还补了 `SegmentedControl` 缺的过渡时长、以及仓库里根本没有的 Switch/Toggle 组件规格。

## 10. 明确禁止

- 纯黑 `#000` 作背景（代码块 `#0d0d0c` 是唯一例外）、纯白 `#fff` 作暗色背景。
- 霓虹蓝、品红、冷紫渐变——整套系统的品牌色只有陶土橙。
- 在已有边框的容器里，给内部次级按钮再加边框（见 `invariants.md` 单边框原则）。
- 直接写 `#d97757` 字面量：用 `bg-clay` / `var(--cds-clay)`，否则暗色 hover 会错。
