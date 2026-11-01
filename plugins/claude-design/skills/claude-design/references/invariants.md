# 硬性约束与验收清单（Invariants）

这些不是"建议"，是这套设计系统能被认出来的原因。任何一条破了，界面立刻从"Claude 味"掉回"通用 SaaS 味"。

**一个前提**：本仓库的组件源码本身并不完全合规——里面有 31 处 `transition-all`、若干 `bg-white` 与 `dark:bg-[#2c2c2a]`，都是逆向阶段的遗留。复制时**顺手按本文改掉**，不要因为有先例就放过；但也不要为了"净化"去改动那些看不出问题的物理常数。

## 1. 单边框原则（The 1-Border Rule）

**一个容器只允许一条闭合边框。** 卡片有边框了，卡片里的次级按钮、标签、chip 就必须 `border-none`，靠 `bg-surface-2 / fill-secondary` 的浅填充表达可交互性。

```tsx
// ✗ 双层边框 = 视觉噪音
<div className="rounded-panel border border-neutral-200 p-3">
  <button className="rounded-lg border border-neutral-200 px-3">重试</button>
</div>

// ✓ 外层独享边框，内层用填充
<div className="rounded-panel border border-[var(--cds-border)] p-3">
  <button className="rounded-lg border-none bg-[var(--cds-fill-secondary)] px-3">重试</button>
</div>
```

同理：输入框里的附件 chip、工具卡里的动作按钮、表格行内的操作，全部遵守。

## 2. 只写语义令牌，不写裸 HEX

```tsx
// ✗
<div className="bg-[#f9f9f7] text-[#151515] border-[#0000001a]" />
// ✓
<div className="bg-surface-0 text-[var(--cds-text-primary)] border-[var(--cds-border)]" />
```

裸 HEX 会锁死单一主题：暗色模式下 `#f9f9f7` 依然是浅灰，界面直接花掉。品牌色也一样——用 `bg-clay` / `var(--cds-clay)`，因为 clay 的 hover 值在明暗两套里不同（`#cc5a36` vs `#e08264`）。

**唯一例外**：`CodeBlock` 的 `#0d0d0c`（代码区恒为深底，明暗模式都不变）。

## 3. 所有动态数字加 `tabular-nums`

计时器、倒计时、token 计数、频率读数、diff 行号、表格数值——数字一变宽度就变，整行会左右抽搐。

```tsx
<span className="tabular-nums">{seconds}s</span>
```

## 4. CJK 输入法合成守卫

中文/日文输入时按下回车是"选词"，不是"发送"。缺这一行的后果是用户打个"你好"就被迫发出去半句话。

```tsx
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.nativeEvent.isComposing || e.keyCode === 229) return;
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSendMessage();
  }
};
```

`e.keyCode === 229` 是 Safari/旧 WebKit 的兜底，两个条件都要。

## 5. 流式输出不许抢滚动

```tsx
// 用户刚滚过，就别把他拽回底部
if (Date.now() - lastUserScrollTime < 150) return;
el.scrollTop = el.scrollHeight;
```

贴底判定给 40px 容差（`scrollHeight - scrollTop - clientHeight < 40`），并优先用 `useClaudeScrollPinning` 而不是自己写。

## 6. 明暗两套都必须验证

暗色不是"把颜色反转"。三处必须单独确认：表面阶梯（暗色靠填充区分层级，浅色靠边框）、发丝环向内翻转（`ring-inner:1px`）、字重不要整体加粗。暗色下 `surface-0 #0b0b0b` 是页底，卡片是 `surface-2 #1a1a19`——卡片比页底**亮**，方向与浅色相反。

## 7. iframe 沙箱：宁可不能用，也不放松

渲染 LLM 生成的 HTML 时：

```tsx
sandbox="allow-scripts"            // 绝不加 allow-same-origin
```

`allow-scripts` + `allow-same-origin` 同时出现等于没有沙箱（同源脚本可以自己摘掉 sandbox 属性）。另外，需要用户手势的操作（音频播放、全屏、剪贴板）必须检查 `navigator.userActivation.isActive`，不要用定时器伪造。

## 8. 零二进制资产

不引入 `.ttf/.otf/.woff`、不引入 `.mp3/.wav`。字体走系统回退栈（`AnthropicSans` 缺失时落 `Inter` → `system-ui` → `PingFang SC`），提示音用 Web Audio 振荡器现场合成：

```ts
const osc = ctx.createOscillator();
const gain = ctx.createGain();
gain.gain.setValueAtTime(0, ctx.currentTime);
gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02); // 30% 基准 + 斜坡，防爆音
```

## 9. 同心圆角

子元素圆角 = 父容器圆角 − 内边距。10px 面板配 4px padding，内部元素就是 6px。全写 10px 会让内角看起来"胖"。

## 10. 键盘可达性

列表、分段控件、工具栏必须支持方向键移动焦点（`useClaudeRovingFocus`），整组只占一个 Tab 位（roving tabindex），Home/End 跳到首尾。焦点环用 `shadow-focus`，不要 `outline: none` 了事。

---

## 交付前自检（逐条打勾）

1. 有没有第二个 `border` 出现在带边框的容器内部？
2. 有没有裸 `#` 颜色值？（`#0d0d0c` 除外）
3. 所有会变的数字都有 `tabular-nums`？
4. 有文本输入的组件都带 IME 守卫？（纯展示组件不涉及，跳过）
5. 流式/轮询追加内容时，用户手动上滚后不会被拽回底部？
6. `.dark` 下重新看过一遍？表面层级方向对、字重没发胖？
7. 所有过渡都来自 `motion.md` 的预设或 `--cds-ease-*`，没有 `transition: all`？
8. 滚动渐隐是 7 档遮罩，不是线性渐变？
9. iframe 没有 `allow-same-origin`？
10. 没有任何字体/音频二进制文件混进来？
