# 动效物理学（Motion Physics）

> 数值全部取自 `references/upstream/code-examples/ClaudeMotionPresets.ts` 与 `cds-theme.css`。
> 上游 `AGENTS.md`（本技能内为 `references/upstream/AGENTS.md`）里的弹簧参数是 v1 手写口径，**与源码不一致**（它写 SNAPPY = 600/30/0.6），以本文为准。
> 阻尼比与超调量是我用文件内 `calcDampedHarmonicOscillator` 的同一套公式算出来的，可直接复核。

## 1. 四个弹簧预设

| 预设 | stiffness (k) | damping (c) | mass (m) | ζ 阻尼比 | 超调 | 2% 收敛 | 用在哪 |
| :-- | --: | --: | --: | --: | --: | --: | :-- |
| `SPRING_BOUNCY` | 600 | 30 | 1.0 | 0.612 | **+8.8%** | 0.28s | 按钮点击、开关切换、图标按压 |
| `SPRING_SNAPPY` | 320 | 28 | 1.0 | 0.783 | +1.9% | 0.31s | 气泡上浮、卡片展开、Popover 唤起 |
| `SPRING_GENTLE` | 380 | 18 | 1.0 | 0.462 | **+19.5%** | 0.45s | 点赞/复制成功的轻快弹跳反馈 |
| `SPRING_HEAVY_SNAP` | 1200 | 80 | 0.1 | 3.651（过阻尼） | 0% | 0.26s | 拖拽落点吸附、磁吸抽屉，**零回弹** |

```ts
import { SPRING_BOUNCY, SPRING_SNAPPY, SPRING_GENTLE, SPRING_HEAVY_SNAP } from './ClaudeMotionPresets';
```

选型口诀：**越接近"物理世界里的重物"，ζ 越大、回弹越少。** 列表重排/落位用 `HEAVY_SNAP`（不弹），按钮用 `BOUNCY`（微弹），浮层用 `SNAPPY`（几乎不弹），"被表扬"的正反馈才用 `GENTLE`（明显弹）。

## 2. CSS 缓动常量（`CDS_EASING`）

| 名称 | 值 | 用途 |
| :-- | :-- | :-- |
| `OVERSHOOT` | `cubic-bezier(.34, 1.3, .64, 1)` | 气泡、胶囊微弹入场 |
| `EASE_OUT_EXPO` | `cubic-bezier(.16, 1, .3, 1)` | 阴影、焦点微光、模糊渐变 |
| `DECEL` | `cubic-bezier(.165, .84, .44, 1)` | 抽屉/面板滑入的减速段 |
| `SHARP_PRESS` | `cubic-bezier(.32, .72, 0, 1)` | 瞬时按压 |

主题 CSS 还注册了一整套：`--cds-ease-swift` (`.16,1,.3,1`)、`-expand` (`.19,1,.22,1`)、`-enter` (`.22,1,.36,1`)、`-out` (`.165,.84,.44,1`)、`-snap` (`.32,.72,0,1`)、`-overshoot` (`.34,1.3,.64,1`)、`-pop` (`.34,1.56,.64,1`)、`-pulse`、`-rise`、`-fall`。写 CSS 过渡时优先引变量，别就地写贝塞尔。

按钮回弹不是贝塞尔，是 15 阶采样弹簧：

```css
--cds-btn-spring: linear(0, .2459, .6526, .9468, 1.0764, 1.0915, 1.0585, 1.0219,
                         .9993, .9914, .9921, .9957, .9988, 1.0004, 1);
```

这是把 ζ≈0.6 的弹簧离散成关键帧的结果，CSS 无法用 `cubic-bezier` 表达这种带超调再回收的曲线。

## 3. 预置变体

| 变体 | initial → animate | 出场 |
| :-- | :-- | :-- |
| `motionMessageFadeUp` | `opacity 0→1`, `y 12→0`, `SPRING_SNAPPY` | `opacity 0`, `y -8`, 180ms `easeIn` |
| `motionUserBubbleEnter` | `opacity 0→1`, `scale .94→1`, `y 8→0`, spring **450/24**（就地内联，非预设） | 无 |
| `motionPopover` | `opacity 0→1`, `scale .95→1`, `y 4→0`, `SPRING_SNAPPY` | `scale .96`, `y 2`, 120ms `easeOut` |
| `motionModalDialog` | `opacity 0→1`, `scale .96→1`, `y 10→0`, spring **400/32** | `scale .96`, `y 6`, 150ms `easeInOut` |
| `motionGraphemeReveal` | `opacity 0→1`, `blur 6px→0`, 350ms `easeOut` | 无 |

规律：**进场慢、出场快**（进场 300–350ms，出场 120–180ms）。人不需要看清"东西怎么消失"。

注意：预置变体不是唯一写法。部分组件在手边就近内联了自己的过渡，和上表不完全一致——例如 `ConfirmationDialog` 面板用 **200ms `DECEL` 补间**、遮罩用 150ms `easeOut`，并没有走 `motionModalDialog`；`ChatMessageBubbles` 的用户气泡用 400ms 的 `message-fade-up` CSS 关键帧。**改这些组件时沿用它们原有的时长，不要"顺手统一"到预设上**，节奏会变。

另有一处上游自身不一致：`cds-theme.css` 的 `dframe-clay-breathe` 是 **3s**，而 `tailwind.config.js` 里注册的 `animate-clay-breathe` 写的是 **2.4s**。以 CSS 与组件实际值为准（3s）。

## 4. 全系统时间常数（跨模块的硬值）

| 值 | 含义 |
| :-- | :-- |
| `70ms` | 触觉微震级反馈 |
| `120ms` | 几何咬合（滑块、开关落位） |
| `150ms` | 滚动钉底冷却闩锁；hover 过渡 |
| `220ms` | 输入框阴影态切换 |
| `300ms` | 面板滑入 |
| `1.2s` | 运行中脉冲（`PulseRunningDot`） |
| `2.0s` | 骨架扫光（`SkeletonSweep`；`tailwind.config.js` 里写的是 1.8s，以组件为准） |
| `1.9s` | 三点波（`QuietDotsWave`） |
| **`3.0s`** | clay 呼吸（`ClayBreatheDot`，`scale .86 → 1`，`brightness .96 → 1.06`） |
| `2.5s` | 复制成功冷却，防连点 |
| `4px` | 指针移动死区（拖拽、缩放判定阈值） |

## 5. 遮罩与渐隐

滚动渐隐用 **7 档非线性 alpha**，不是线性渐变（线性会让边缘"糊成一片"）：

```css
mask-image: linear-gradient(to bottom,
  transparent 0%,
  rgba(0,0,0,.05) 15%,
  rgba(0,0,0,.18) 32%,
  rgba(0,0,0,.38) 50%,
  rgba(0,0,0,.64) 68%,
  rgba(0,0,0,.88) 85%,
  #000 100%);
```

`cds-theme.css` 里的 `.scroll-fade` 更进一步：用滚动驱动自定义属性把四边的 fade 尺寸乘上"该边是否真的还能滚"的开关量（`--cds-scroll-fade-top-on` 等），滚到顶时顶部遮罩自动归零——否则内容会永远蒙着一层雾。

## 6. 禁止项

- `transition: all .3s linear` / `all .5s ease`——"匀速 + 全能过渡"是这套系统里最刺眼的味道。
- 用 `max-height` 或 `height: auto` 做展开动画（无法插值，且会抖）。用 framer-motion 的高度弹簧。
- 给同一个元素同时挂 CSS transition 和 framer-motion 动画（会互相抢帧）。
- 在流式输出期间无视 150ms 冷却、强行 `scrollTo(bottom)`。
- 为了"更活泼"把 ζ 调到 0.3 以下；官方最弹的一档也只到 0.46。
