[English](README.en.md) | 中文

# dsh-mcp-manager-ui

左侧栏里的 MCP 服务器管理入口：点开后是主区域的服务器页面。它驱动 Harness 内置的 `@deepseek-ai/dsh-mcp-manager`——读连接状态、写 profile 配置——不自己连接 MCP 服务器。

## 安装

**前置条件**：DSH ≥ `0.2.2-rc.5`（该版本起 `dsh-web-app` 自带 `mcp-manager` 行）。装完需要重启 Harness 一次，浏览器才会加载客户端模块。

### 从 Git 仓库

```text
plugin_manager install_bundle target=https://github.com/whereislittlefish-dot/dsh-mcp-manager-ui
```

也可以在桌面端的插件市场里选「从 GitHub 安装」并填仓库地址。

### 从本地包（tgz）

```text
npm pack
plugin_manager install_bundle target=<绝对路径>/dsh-mcp-manager-ui-1.0.0.tgz
```

### 从本地目录（开发用）

```text
plugin_manager install_bundle target=<绝对路径>/mcp-manager-ui
```

这种安装是目录链接，改代码后重新启用插件即可生效；删掉源目录插件就坏了。

## 界面

- **左侧栏**：一个「MCP 服务器」图标入口（与 Settings、技能中心同一行级）。折叠成 56px 轨道时显示图标，悬停给出名称。
- **主区域**：服务器列表，每行显示连接状态、工具数量、传输方式与命令/地址；行内是开关、编辑、详情；详情里是完整配置、状态处置建议与测试连接 / 重启 / 删除。

## 操作

| 操作 | 行为 |
|---|---|
| 新建 | 选择本地命令（stdio）或 HTTP 端点（streamable-http），填写后写入配置并开始连接 |
| 编辑 | 修改名称、传输方式、命令、参数、工作目录、环境变量、地址、请求头、工具调用超时；改名会提示工具名变化 |
| 启用 / 停用 | 只切换 `enabled` 意图，配置保留 |
| 重启 | 重建实例并重置重连预算 |
| 测试连接 | 在不影响线上实例的前提下连接、列出工具名、关闭；停用的服务器也能测 |
| 删除 | 确认弹层写清后果后执行 |

## 边界

- 来自下层配置（bundle 或 profile 基线）的服务器不能删除，确认层只提供「停用」。
- 插件在运行期注册的服务器只读，只显示状态。
- 删除后清理未完成的记录显示为「残留记录」，重启 Harness 后才消失，期间禁止复用同名。
- 写入落在活动 profile 的 `cordis.patch.yml`，与「设置」同一条路径；更高优先级的覆盖会让写入被拒绝并报错。
- 密钥建议用 `${credential:名称}` 模板；列表只显示键名，编辑表单默认隐藏值。

## 示例：接入一个 stdio MCP 服务器

在面板里新建，或在 profile 的 `cordis.patch.yml` 里写：

```yaml
- id: mcp-manager
  name: "@deepseek-ai/dsh-mcp-manager"
  config:
    servers:
      demo:
        transport: stdio
        command: npx
        args:
          - -y
          - "@modelcontextprotocol/server-filesystem"
          - D:/work
        env:
          EXAMPLE_TOKEN: "${credential:EXAMPLE_TOKEN}"
        enabled: true
```

## 安全

浏览器通过 `POST /mcp-manager-ui/api/rpc` 访问 Host，请求先过 Connection 的 Host/Origin 与浏览器会话校验；除本面板外没有其它入口。

## 验证

- Host 半 38 项行为测试（保存/校验/传输切换/改名/启停/删除/继承条目/只读注册/残留记录/缺失管理器）。
- 浏览器半 20 项契约测试（模块 id、slot 注册、locale 字典 129 键双语对齐、样式令牌、图标契约）。
- 安装后同源探测返回 401（Host/Origin 通过，等待浏览器会话），外源 Origin 返回 403。
