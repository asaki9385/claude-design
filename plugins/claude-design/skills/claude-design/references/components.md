# 组件索引（Component Index）

`references/upstream/code-examples/` 下有 33 个 TS/TSX 模块 + `cds-theme.css` + `tailwind.config.js`，全部是可独立拷贝的源码，不依赖本仓库的构建产物。

**用法**：需要哪个组件，就 `Read` 对应的 `references/upstream/code-examples/<Name>.tsx`，整段照抄进用户项目，再按用户需求裁剪。不要凭记忆重写组件内部的类名与物理常数——源码里那些看起来很怪的数字（`0.975`、`-0.125em`、`74px`、`150ms`、`linear(0,.2459,…)`）都是逆向校准出来的，改一个就会看得出生硬。

**拷贝时的相对路径**：上游的 `src/index.ts` 从仓库根的 `code-examples/` 统一再导出。本技能在 `references/upstream/` 中保留了完整上游目录结构，因此 README、docs 和工程配置里的相对链接都能按原路径理解。上手时不必按原路径还原仓库结构——直接把用到的文件拷进用户项目，把同目录的相互引用（如 `ClaudeMotionPresets.ts`）一起带上即可。

**依赖**：`react >= 18`、`framer-motion >= 10`、`lucide-react >= 0.280`（peerDependencies）。纯 CSS 组件不需要 framer-motion。

---

## 1. 基础原子控件

| 组件 | 关键 props | 规格要点 | 何时用 |
| :-- | :-- | :-- | :-- |
| `CdsButton` | `variant: primary\|secondary\|ghost\|danger\|brand\|onContent\|outline`<br>`size: xxs\|xs\|sm\|md\|lg\|icon`<br>`icon`, `iconPosition`, `isLoading`, `indicator` | 尺寸阶梯 XS `h-6/6px`、SM `h-7/8px`、MD `h-8/8px`、LG `h-10/12px`；外层定位壳 + 内层 `data-cds-part="paint"` 绘景层，杜绝 padding 与边框互相干涉；按压走 `.cds-btn-squish`（scale .975 + 15 阶 `linear()` 弹簧） | 任何按钮。**卡片内的次级按钮用 `secondary`，不要加边框** |
| `SegmentedControl` | `tabs: (string \| {id, label, icon?, badge?})[]`<br>`value` / `defaultValue` / `onChange(id, index)`<br>`size: sm\|md`、`useFramerMotion` | 9999px 胶囊轨道 + 1px 几何内边距；滑块位置/宽度是**内联 style 算的**，不依赖额外 CSS；`useFramerMotion` 时改用 `layoutId` 弹簧。**必须引 `compat.css` 的 `.duration-120`，否则滑块瞬移**；手册 2.2.2 的窄容器折叠规则组件里没实现 | 2–4 个互斥视图切换（代码/预览、浅色/深色） |
| `StatusIndicators` | `StatusDot{kind: ready\|running\|error\|clay, label}`<br>`ClayBreatheDot{label}`<br>`PulseRunningDot`<br>`QuietDotsWave{label='Thinking...'}`<br>`SkeletonSweep{rounded}` | clay 呼吸 3.0s、运行脉冲 1.2s、三点波 1.9s、骨架扫光 2.0s（配置里写 1.8s，以组件为准）；`status-dot[data-kind]` 由 CSS 驱动 | 加载、思考、运行中、错误态 |
| `ConfirmationDialog` | `isOpen`,`onClose`,`onConfirm`,`title`,`description`<br>`confirmLabel`,`cancelLabel`,`variant: danger\|default`,`size: sm\|md\|lg`,`icon` | `rounded-2xl` + 双环 popover 阴影；面板 200ms `DECEL` 补间、遮罩 150ms；`danger` 只换按钮色，不改面板底色。**只有 Esc 关闭，没有焦点陷阱、没有关闭后的焦点归还**——无障碍要求高的场景需自行补 | 破坏性操作确认 |
| `AttachmentCard` | `name`,`size`,`type`,`category`,`uploading`,`uploadProgress(0-100)`<br>`onRemove`,`onClick`, `layout: tile\|chip` | tile = 128×96 磁贴（`rounded-card`），chip = 行内胶囊（10px，12px 高亮徽标） | 附件列表、输入框内附件 |

## 2. 会话流与输入

| 组件 | 关键 props | 规格要点 | 何时用 |
| :-- | :-- | :-- | :-- |
| `ChatComposer` | `onSendMessage(text, attachments, model, thinking)`<br>`placeholder`,`initialModel`<br>导出 `CLAUDE_MODELS` | 20px 圆角主终端、`field-sizing: content` 自增高、`shadow-composer` 三态（默认/hover/focus）、内嵌模型切换与 thinking 开关 | 聊天输入框本体 |
| `ChatComposerChin` | `currentEffort`,`onEffortChange`,`failedQueueCount`,`onRetryQueue` | 输入框下方的"下巴"工具条：推理档位 + 失败队列重试 | 需要 effort 档位时 |
| `ChatMessageBubbles` | **用户**：`text`,`time`,`attachment`,`author: self\|other`,`textSize`,`state: pending\|failed\|done`,`collapsible`,`onRetry`,`onEdit`<br>**助手**：`text`,`modelName`,`thinkingTime`,`thinkingSteps`,`isThinkingLive`,`codeSnippet`,`artifact`,`suggestedChips`,`onSelectChip`,`onOpenArtifact`,`onCopyResponse` | 用户气泡 `rounded-bubble`(18px) + 85% 量度；助手消息**无边框无底色**，纯文本流；失败态才有重试 | 任何消息列表 |
| `ThinkingAccordion` | `thoughtText`,`isThinkingLive`,`elapsedMs`,`onCopyQuote` | 高度用弹簧展开（不是 `max-height` 过渡）；单个 clay 呼吸点；思考中禁止折叠抖动 | 展示思维链 |
| `RichComposerWithMentions` | `placeholder`,`onSubmit({text, slashCommand, mentions})`,`disabled`,`maxTokens` | `/` 命令与 `@` 上下文双触发浮层；**CJK IME 合成守卫**；token 预算估算 | 带命令/提及的富输入 |
| `ModelSwitcherWithTokenGauge` | `currentModelId`,`onSelectModel`,`tokenMetrics`<br>导出 `AVAILABLE_MODELS` | 三档模型切换 + Extended Thinking 开关 + 4 色记忆 SVG 仪表 | 模型选择器 |
| `McpToolDecisionCard` | `toolCall`,`onVerdict('allow_once'\|'always_allow'\|'deny', modifiedParams)` | 三态生命周期 `pending_approval → running → success/error`；三级动作数组 | MCP 工具授权卡片 |
| `ModelSelectorEffort` | `EFFORT_META`、`ModelSelectorEffort` | 推理强度五档 `low \| medium \| high \| xhigh \| max`，每档带名称/说明/告警文案 | 与 chin 搭配 |

## 3. 动效与环境光影

| 组件 | 关键 props | 规格要点 | 何时用 |
| :-- | :-- | :-- | :-- |
| `ClaudeMotionPresets` | 导出 4 个 spring、`CDS_EASING`、5 个 variants、`calcDampedHarmonicOscillator` | 详见 `motion.md` | 所有动效的唯一来源 |
| `ReasoningAmbientGlow` | `active`,`statusText`,`durationSeconds`,`showCanvasBackdrop`,`children`<br>另导出 `ShimmerText`、`ThreePhasePulseDots`、`LinearSweepProgress` | 暖 clay 弥散光场 + 非对称扫光（`shimmer-text-shine`）+ 焦散 canvas | 推理中/生成中的氛围层 |
| `ScrollFadeContainer` | `children`,`orientation: vertical\|horizontal\|both`,`fadeSize=28` | 7 档非线性渐变遮罩 + 边缘传感器动态归零；**不要**换成线性渐变 | 长列表、侧栏滚动区 |

## 4. 视听与产物交互

| 组件 | 关键 props | 规格要点 | 何时用 |
| :-- | :-- | :-- | :-- |
| `ClaudeAudioPlayer` | 类/工具导出 | Web Audio 振荡器合成提示音，30% 音量基准，`gain` 斜坡防爆音；无音频文件 | 完成/错误提示音 |
| `LiveMicActivityBars` | `mode: VoiceMode`,`audioStream: MediaStream`,`size`,`minHeight`,`maxHeight` | 6 段频带 85Hz–4.8kHz、8% 噪声门、`Math.pow(e,.7)` 伽马压缩 | 语音输入律动 |
| `MediaLightboxViewer` | `items: MediaItem[]`,`initialIndex`,`isOpen`,`onClose`,`backdrop: blur\|dim`,`renderHeader`,`renderAttribution` | 75vw 跑道视口、**以光标为锚点**的仿射缩放、4px 指针死区、Ctrl+滚轮缩放 | 图片/视频大图查看 |
| `useClaudeSharedElementTransition` | `isOpen`,`originRef`,`transitionName='chat-image-preview'` | `startViewTransition` 包装、动态圆角探测、`object-fit: contain` 裁切计算 | 缩略图 → 大图的共享元素转场 |
| `ArtifactsSplitPaneResizer` | `leftPane`,`rightPane`,`initialSplitRatio=.5`,`minLeftWidth=380`,`minRightWidth=420`,`collapseThreshold=.18` | 拖拽时给 iframe 盖指针盾（否则丢事件）、4px 死区、双击 50/50 弹簧归位 | 产物双栏 |
| `EpitaxyIframeBridge` | `srcDoc`,`mimeType`,`allowedOrigins`,`onMessage`,`onError`,`onRecovered` | 严格 Origin 校验 + 频道隔离 postMessage RPC + `navigator.userActivation` 手势门控；**禁止 `allow-same-origin`** | 渲染 LLM 生成的 HTML |
| `StreamingDiffViewer` | `filename`,`language`,`rawDiff`,`isStreaming`,`defaultViewMode: unified\|split`<br>导出 `parseGitDiff` | 行号列 `tabular-nums` 对齐、增量流式管线、2.5s 复制冷却 | 代码 diff |
| `CodeBlock` | `code`,`language`,`filename`,`showLineNumbers` | 12px 圆角、`#0d0d0c` 实底、语言标签行内光学对齐、复制冷却 | 代码展示 |

## 5. 桌面宿主与多代理

| 组件 | 关键 props | 规格要点 | 何时用 |
| :-- | :-- | :-- | :-- |
| `createClaudeMainWindow` | — | Electron BrowserWindow 工厂：`hiddenInset` 标题栏、macOS `under-window` 毛玻璃、默认 1200×800、最小 600×400 | Electron 桌面壳 |
| `ClaudeDesktopHeader` | `title`,`children` | 给 macOS 红绿灯留 74px 反向缩放槽位（`ew = 74`）+ 45px 拖拽带 | 桌面自绘标题栏 |
| `DraggableSessionList` | `onSelectSession`,`activeSessionId` | `pinnedOrder` 乐观拓扑重排、4px 死区、倾斜幽灵阴影 | 会话列表拖拽排序 |
| `CoworkAgentCanvas` | 无（内部状态） | 多代理任务委派状态机、团队共享产物池、跨窗口 `BroadcastChannel` 同步 | 多代理协作视图 |
| `CdsMotionEngine` | 无（演示） | 弹簧/缓动参数的交互式试验台 | 调参参考，不必上生产 |
| `ContainerResponsiveBar` | `children` | `@container` 驱动的四档流式压缩矩阵（`>=576px` / `<480px` / `<384px` / `<320px`），按**容器**宽度而非视口收窄，防止窄侧栏里文字断字 | 侧栏/卡片内的工具栏、输入框下巴 |

## 6. Hooks

| Hook | 签名 | 作用 |
| :-- | :-- | :-- |
| `useClaudeScrollPinning` | `(dependencies: any[])` | 流式输出时保持贴底，但**150ms 冷却闩锁**防抢滚动 |
| `useClaudeRovingFocus` | `(itemCount, {orientation, loop, dir})` | WAI-ARIA roving tabindex：1D/2D 方向键、Home/End 边界跳转 |
| `useRateLimitBackoff` | `(onAutoRetry)` | 429/503 截断指数退避 + 全抖动 + 熔断 |
| `useClaudeSharedElementTransition` | 见上表 | 共享元素转场 |

---

## 已知缺口（别去源码里找，它不在）

| 缺什么 | 影响 | 怎么办 |
| :-- | :-- | :-- |
| **Switch / Toggle** 没有独立组件 | 设置面板、隐私开关都要用到 | 按 `compat.css` 第 4 节的规格自建（轨道 38×22、滑块 18、开=`clay`、`SPRING_BOUNCY`、`role="switch"`） |
| `ConfirmationDialog` 无焦点陷阱 / 无焦点归还 | 键盘用户 Tab 能跑到弹窗外 | 用 `useClaudeRovingFocus` 的思路补 tabindex 循环，或换用成熟 dialog 原语再套 CDS 皮肤 |
| `SegmentedControl` 未实现 `@container` 折叠 | 窄侧栏里标签会挤 | 需要时贴 `compat.css` 第 3 节，并给激活项补 `data-active` |
| `ConfirmationDialog` 头注释提到 `xl: 880px` | 类型只有 `sm \| md \| lg`（400/520/720px） | 以类型为准 |
| 没有表单控件族（Input / Select / Checkbox） | 复杂表单要自己搭 | 用 `--cds-bg-input` 语义 + `shadow-composer-focus` 焦点态，保持与其他控件同一套边框与圆角 |

## 组合套路（可直接套用）

**聊天页**：`ScrollFadeContainer` 包住消息列表 → `AssistantMessageBubble` / `UserMessageBubble` 交替 → `ThinkingAccordion` 插在助手消息上方 → 底部 `ChatComposer`（或 `RichComposerWithMentions`）+ `ChatComposerChin`。

**工具授权流程**：`McpToolDecisionCard` 的 `pending_approval` → 用户选择 → `running`（配 `PulseRunningDot`）→ `success`/`error`。不要自己另发明第四种状态。

**产物面板**：`ArtifactsSplitPaneResizer` + `EpitaxyIframeBridge`（左）/ `StreamingDiffViewer` 或 `CodeBlock`（右），大图再叠 `MediaLightboxViewer`。

**设置面板**：`SegmentedControl` 分页 + `CdsButton variant="secondary"` 行内操作 + `ConfirmationDialog variant="danger"` 二次确认。
