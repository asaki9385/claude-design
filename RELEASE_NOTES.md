# Claude Design v1.1.0

可独立安装的 Claude Design System Agent Skill，包含完整组件源码、设计令牌、动效规范和离线交互故事书。

## 包含内容

- 33 个 React/TS 组件模块。
- 完整 v1/v2 文档，共 10,094 行。
- 71 个文件的上游源码快照，逐文件 SHA-256 校验。
- 9 章节、376.8 KB 的零外部请求离线故事书。
- 设计令牌、组件索引、动效参数、验收清单和单文件构建工具。

## 下载

| 文件 | 用途 |
| :-- | :-- |
| `claude-design.skill` | 直接导入支持 Agent Skills 的客户端 |
| `claude-design-skill-v1.1.0.skill` | 同上，版本化文件名 |
| `claude-design-plugin.zip` | 解压后用 `claude --plugin-dir` 加载插件 |
| `claude-design-plugin-v1.1.0.zip` | 同上，版本化文件名 |
| `SHA256SUMS` | 下载完整性校验 |
| `release-manifest.json` | 版本、提交号和产物哈希 |

## 直接导入

1. 下载 `claude-design.skill`。
2. 在支持 Agent Skills 的客户端中选择导入或上传 Skill。不同客户端的入口名称可能不同。
3. 也可以解压后，把顶层 `claude-design/` 目录复制到 `~/.claude/skills/`、`~/.codex/skills/` 或项目的 `.agents/skills/`。

Claude Code 插件：

```bash
unzip claude-design-plugin.zip
claude --plugin-dir ./claude-design
```

## 质量验证

发布前自动执行：

- `npm ci`，确保锁文件可重装。
- 33 个组件与 71 个上游文件完整性检查。
- React/Tailwind 离线故事书重建。
- jsdom 12 项交互断言。
- 真实 Chrome 桌面与移动端测试。
- 零外部 HTTP 请求检查。
- `.skill` 与插件 ZIP 重读、逐文件哈希比对。

## 校验

```bash
shasum -a 256 -c SHA256SUMS
```

## 许可

MIT。上游来源为 [Caho1/open-claude-ui](https://github.com/Caho1/open-claude-ui)。本项目与 Anthropic 无隶属关系，不包含 Anthropic 专有字体或录音资产。

