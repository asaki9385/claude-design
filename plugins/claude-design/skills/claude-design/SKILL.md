---
name: claude-design
description: Build or restyle React interfaces in the Claude Design System (CDS) — the warm terracotta, low-contrast-surface, spring-physics look of Anthropic's desktop client. Use when the user asks for a Claude-style UI, a chat composer, message bubbles, thinking accordion, model switcher, tool-permission card, segmented control, popover/dialog, split artifact pane, streaming diff, audio/mic indicators, or asks to make an existing UI "像 Claude", "陶土色", "高级感", "有呼吸感的动效". Also use when reviewing why a UI feels off-brand, fixing motion that looks linear or bouncy, or porting these 33 components into a project. Ships the full reverse-engineered component source, design tokens and motion constants — do not invent approximations when the source is available.
license: MIT
---

# Claude Design

一套逆向还原的 Claude 设计系统（CDS）实现：33 个可直接拷贝的 React/TS 模块、完整的语义令牌、四档弹簧物理参数，并附带完整的上游 v1/v2 文档、源码快照和离线组件故事书。

**核心判断：这个仓库的价值在"精确"，所以先读源码，再写代码。** 凭印象写出来的陶土橙界面，颜色对、圆角对，但动效和边框一定不对——而那是它像不像 Claude 的全部区别。

## 何时读哪份参考

| 你在做什么 | 先读 |
| :-- | :-- |
| 任何任务的第一步 | `references/design-tokens.md`（颜色/圆角/阴影/字体，含暗色口径） |
| 要放一个具体控件，或想找"该用哪个组件" | `references/components.md`（33 个模块的 props、规格、组合套路） |
| 加任何过渡、入场、展开、拖拽吸附 | `references/motion.md`（4 档弹簧 + 缓动 + 全系统时间常数） |
| 收尾自检、代码 review、解释"为什么不高级" | `references/invariants.md`（10 条硬约束 + 10 项验收清单） |
| 需要照抄实现 | `references/upstream/code-examples/<Name>.tsx` — 单文件即完整实现 |
| 需要 v1 深层原理（为什么是这个数值） | `references/upstream/docs/v1/01-…08-…md` |
| 需要 v2 / Desktop 2.0 新架构 | `references/upstream/docs/v2/`（6 章 + 单文件完整版） |
| 要查完整上游工程与原始路径 | `references/upstream/README.md` 与 `references/upstream/src/index.ts` |
| 要看全部组件的真实交互 | `assets/claude-components-storybook.html`（离线） |
| 要把成果打成一个可直接打开的单文件 HTML | `references/build-single-file.md` + `scripts/` |

**文件位置**：下表路径都相对本技能目录。安装或拷贝时请把本目录与 `references/`、`scripts/`、`assets/` 一起保留，不要只复制 `SKILL.md`。

## 工作流

1. **定层级**：先决定页面用哪几级 surface（0 底 / 1 侧栏 / 2 卡片 / 3 悬浮），写在结构最外层。层级靠微明度差 + 发丝边框建立，不靠投影。
2. **选组件**：查 `components.md` 的索引表。有现成组件就用现成的——不要为了"更贴合需求"自己重写一个按钮，尺寸阶梯和按压曲线一旦自创就对不上。索引末尾的「已知缺口」列了仓库**没有**的东西（Switch、表单控件族、焦点陷阱），那里给了自建规格，别去源码里翻一个不存在的组件。
3. **抄源码**：`Read` 目标文件，整段复制进用户项目，只裁剪业务逻辑（数据来源、回调），保留类名、物理常数、守卫代码。
4. **补令牌**：引入 `cds-theme.css` + `compat.css`（顺序不能反），并打开 `tailwind.config.js` 的 `clay`/`surface`/`borderRadius`/`boxShadow` 扩展。`compat.css` 补齐了上游漏带的 17 个变量和 11 个工具类——不引它，分段控件滑块会瞬移、阴影会消失。
5. **过清单**：按 `invariants.md` 的 10 项逐条自检，尤其 IME 守卫、`tabular-nums`、单边框、暗色复看。

## 最小起步

```bash
# 用户项目里的目录约定（与仓库一致即可）
src/
  components/cds/        # 从 references/upstream/code-examples/ 拷进来的组件
  styles/cds-theme.css   # 拷 cds-theme.css
  styles/compat.css      # 拷 compat.css（补齐缺失令牌与工具类）
tailwind.config.js       # 合并 clay / surface / borderRadius / boxShadow 扩展
```

```tsx
// 入口文件，顺序不能反
import './styles/cds-theme.css';
import './styles/compat.css';
// 暗色：<html class="dark"> 或 <html data-mode="dark">
```

一个最小的 Claude 风格消息流：

```tsx
<ScrollFadeContainer className="flex-1 overflow-y-auto px-6">
  <UserMessageBubble text="帮我把这个函数改成纯函数" time="14:02" />
  <ThinkingAccordion thoughtText="先看有没有外部状态…" isThinkingLive={false} elapsedMs={4200} />
  <AssistantMessageBubble text="改好了，副作用移到调用方。" modelName="Claude" />
</ScrollFadeContainer>
<ChatComposer onSendMessage={(text, files, model, thinking) => send({ text, files, model, thinking })} />
```

## 打成单文件 HTML（可选收尾）

改完之后，如果对方想要"能直接双击看"的东西，用 `scripts/` 打成零外部请求的单文件：

```bash
npm i -D esbuild tailwindcss@3.4 @tailwindcss/container-queries \
         react react-dom framer-motion jsdom

node scripts/build-single-file.mjs \
  --entry   ./entry.tsx \
  --out     ./demo.html \
  --theme   ./references/upstream/code-examples/cds-theme.css \
  --theme   ./references/compat.css \
  --content ./references/upstream/code-examples

node scripts/verify-bundle.mjs ./demo.html --expect "页面里的某段文字"
```

`--theme` 可重复，**顺序不能反**（先主题、后兼容层）。构建器会自检产物里有没有残留外部
引用或 `@tailwind` 指令，有则直接失败退出。

**这步不能省的理由**：截图只能证明"渲染出来了"，证明不了"交互是活的"。
`verify-bundle.mjs` 用 jsdom 真执行 bundle、真点击、真断言状态变化。不要只交一张图就说完成。

现成示例有两个，均可双击离线打开：

- `assets/cds-offline-demo.html`（349 KB）：按钮 / 分段控件 / 思考折叠的精简验证页。
- `assets/claude-components-storybook.html`（377 KB）：上游完整组件故事书，含 9 个章节、CDS 2.0 工作台和主题/X-Ray 切换。

上游原始故事书保留在 `references/upstream/docs/claude-components-storybook.html`。原版依赖 CDN；`assets/` 中是由本仓库构建、React 与 Tailwind 已内联的离线版本。

## 五条最常被违反的规则

1. **单边框**：容器有边框，内部次级按钮就 `border-none`，改用 `fill-secondary` 浅填充。
2. **不写裸 HEX**：用 `bg-surface-0`、`var(--cds-text-primary)`、`bg-clay`。`#0d0d0c`（代码块）是唯一例外。
3. **动效只用预设**：四档弹簧 + 十个 `--cds-ease-*`。禁止 `transition: all .3s linear`。
4. **中文输入守卫**：`if (e.nativeEvent.isComposing || e.keyCode === 229) return;`，否则回车会误发。
5. **暗色要复看**：暗色下表面阶梯方向相反（卡片比页底亮），发丝环由外翻到内。

## 交付时的说法

改完后用一句话说明改了哪一层（令牌 / 组件 / 动效），并指出仍在用户侧待定的部分（比如"主题切换还没接"）。如果用户问"为什么看起来像官方"，答案通常是三件事：低对比表面阶梯、发丝边框、非线性弹簧——而不是配色本身。

## 免责

本技能捆绑的是 MIT 许可的社区逆向实现（github.com/Caho1/open-claude-ui），不含任何 Anthropic 专有二进制资产（字体、音频）。完整上游快照位于 `references/upstream/`；它是设计系统的独立复刻，不是官方 SDK。商标与品牌资产仍归 Anthropic 所有，产出用于自有产品时请自行确认合规边界。
