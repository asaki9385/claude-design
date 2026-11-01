/**
 * CDS Tailwind Preset
 *
 * 把 claude-design 的 tailwind.config.js 与「已知偏差修复」合并成一份可直接用的预设。
 * 用法：
 *   module.exports = {
 *     presets: [require("./scripts/tailwind.preset.js")],
 *     content: ["./src/**\/*.{ts,tsx}"],
 *   };
 */

/** @type {import('tailwindcss').Config} */
const preset = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        clay: {
          DEFAULT: "#d97757",
          hover: "#cc5a36",
          light: "#fbf3ef",
          dark: "#e08264",
        },
        brand: "#c6613f",
        surface: {
          0: "var(--cds-surface-0)",
          1: "var(--cds-surface-1)",
          2: "var(--cds-surface-2)",
          3: "var(--cds-surface-3)",
          popover: "var(--cds-surface-popover)",
        },
      },

      fontFamily: {
        sans: [
          "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI",
          "Roboto", "Helvetica", "Arial", "PingFang SC", "Hiragino Sans",
          "Microsoft YaHei", "sans-serif",
        ],
        serif: ["ui-serif", "Georgia", "Times New Roman", "Songti SC", "serif"],
        mono: ["ui-monospace", "SF Mono", "Menlo", "Consolas", "monospace"],
        // 修复：SegmentedControl 用到但未注册
        control: ["system-ui", "-apple-system", "sans-serif"],
      },

      borderRadius: {
        xs: "var(--radius-xs, 2px)",
        sm: "var(--radius-sm, 4px)",
        md: "var(--radius-md, 6px)",
        lg: "var(--radius-lg, 8px)",
        panel: "var(--cds-panel-radius, 10px)",
        xl: "var(--radius-xl, 12px)",
        "2xl": "var(--radius-2xl, 16px)",
        "3xl": "var(--radius-3xl, 24px)",
        bubble: "var(--cds-message-bubble-radius, 12px)",
        composer: "var(--cds-radius-composer, 20px)",
        pill: "var(--df-radius-pill, 999px)",
      },

      boxShadow: {
        sm: "var(--cds-shadow-sm)",
        md: "var(--cds-shadow-md)",
        lg: "var(--cds-shadow-lg)",
        popover: "var(--cds-shadow-popover)",
        composer: "var(--cds-shadow-composer)",
        "composer-hover": "var(--cds-shadow-composer-hover)",
        "composer-focus": "var(--cds-shadow-composer-focus)",
        "focus-glow": "var(--cds-focus-shadow)",
        "drop-glow": "var(--cds-shadow-drop-glow)",
        panel: "var(--cds-panel-shadow)",
        "panel-hover": "var(--cds-panel-shadow-hover)",
        // 修复：组件用到但源 config 未定义
        field: "0 1px 2px rgba(0,0,0,0.04)",
        "2xs": "0 1px 2px rgba(0,0,0,0.05)",
      },

      // 修复：SegmentedControl 的 duration-120
      transitionDuration: { 120: "120ms" },

      // 修复：ChatMessageBubbles 的 gap-xs
      spacing: { xs: "4px" },

      // 修复：ChatMessageBubbles 的 text-heading
      fontSize: {
        heading: ["1rem", { lineHeight: "1.4" }],
      },

      animation: {
        "quiet-dot": "timeline-quiet-dot 1.9s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        "message-fade-up": "message-fade-up 0.45s cubic-bezier(0.34, 1.3, 0.64, 1)",
        "clay-breathe": "dframe-clay-breathe 2.4s infinite ease-in-out",
        "dot-pulse": "dframe-dot-pulse 1.2s infinite ease-in-out",
        "shimmer-sweep": "cds-skeleton-sweep 1.8s infinite cubic-bezier(0.4, 0, 0.2, 1)",
        "thumbnail-grow": "file-thumbnail-grow-in 250ms cubic-bezier(0.165, 0.84, 0.44, 1)",
      },
    },
  },
};

// 修复：SegmentedControl 的 @[max-width:*] 容器查询语法
let plugins = [];
try {
  plugins = [require("@tailwindcss/container-queries")];
} catch {
  // 没装插件时静默降级——标签文字不会折叠，但不会构建失败
  plugins = [];
}

preset.plugins = plugins;

module.exports = preset;
