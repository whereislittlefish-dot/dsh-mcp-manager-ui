/**
 * `dsh-mcp-manager-ui` — browser half.
 *
 * One sidebar panel entry plus its center-column page. The page is a management
 * surface for the MCP server fleet owned by `@deepseek-ai/dsh-mcp-manager`:
 * it lists servers with live connection state, and adds, edits, enables,
 * disables, restarts, probes and deletes them through the Host half's fenced
 * RPC route. Nothing here connects to an MCP server directly.
 */
window.__ModuleLoader__.load({
  id: 'dsh-mcp-manager-ui',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Client locale namespace. */
    const NS = 'mcp-manager-ui'
    /** Sidebar entry id and the `main` slot key it selects. */
    const PANEL_ID = 'mcp-manager-ui'
    /** Host RPC endpoint registered by index.js. */
    const RPC_URL = '/mcp-manager-ui/api/rpc'
    /** Background refresh cadence while the page is visible. */
    const POLL_MS = 3000
    /** Panel entry order inside the sidebar list. */
    const PANEL_ORDER = 55
    /** Status states the manager can publish. */
    const STATES = new Set(['connected', 'connecting', 'reconnecting', 'waiting-credentials', 'disabled', 'failed', 'closed'])
    /** Where a listed server comes from. */
    const SOURCES = new Set(['profile', 'inherited', 'registered', 'removed'])

    const DICT_ZH = {
      'panel.label': 'MCP 服务器',
      'page.title': 'MCP 服务器',
      'page.subtitle': '从左侧栏打开的 MCP 服务器页面：查看连接状态，新建、编辑、启停、测试与删除。这里的改动与「设置」里的 MCP 配置是同一份。',
      'page.count': '{count} 个服务器',
      'page.connected': '{count} 个已连接',
      'page.updatedAt': '更新于 {time}',
      'action.add': '新建服务器',
      'action.refresh': '刷新',
      'action.edit': '编辑',
      'action.delete': '删除',
      'action.restart': '重启',
      'action.probe': '测试连接',
      'action.cancel': '取消',
      'action.save': '保存',
      'action.saving': '保存中…',
      'action.probing': '测试中…',
      'action.restarting': '重启中…',
      'action.details': '详情',
      'action.hide': '收起',
      'action.showValues': '显示值',
      'action.hideValues': '隐藏值',
      'empty.title': '还没有 MCP 服务器',
      'empty.body': '添加一个 MCP 服务器后，它的工具会以 mcp__名称__工具 的形式自动提供给模型，随时可以停用或删除。',
      'empty.hint': '支持本地命令（stdio）和 HTTP 端点（streamable-http）。bundle 或 cordis.yml 里静态写死的 MCP 服务器不在此列，需要在这里添加为条目。',
      'state.connected': '已连接',
      'state.connecting': '连接中',
      'state.reconnecting': '重连中',
      'state.waiting-credentials': '等待凭据',
      'state.disabled': '已停用',
      'state.failed': '失败',
      'state.closed': '已关闭',
      'state.unknown': '未知状态',
      'badge.stdio': 'stdio',
      'badge.http': 'HTTP',
      'badge.profile': '本机配置',
      'badge.inherited': '下层配置',
      'badge.registered': '插件注册',
      'badge.removed': '残留记录',
      'meta.tools': '{count} 个工具',
      'meta.lastError': '最近错误',
      'meta.command': '命令',
      'meta.args': '参数',
      'meta.url': '地址',
      'meta.cwd': '工作目录',
      'meta.env': '环境变量',
      'meta.headers': '请求头',
      'meta.timeout': '工具调用超时',
      'meta.attempt': '重连 {attempt}/{max}',
      'hint.registered': '这个服务器由插件在运行期注册，面板只能查看状态；请在该插件的配置里调整。',
      'hint.removed': '上次删除后连接没有确认关闭，残留记录会在重启 Harness 后消失；在此之前不能复用同名服务器。',
      'hint.credentials': '配置里的 ${credential:名称} 还没有解析成功：在凭据里补上对应名称，或改成直接填写值。',
      'hint.restart': '重连次数已用尽，点「重启」重建连接。',
      'hint.reconnectOff': '这个条目关闭了自动重连，点「重启」重新连接，或编辑后开启重连。',
      'hint.restartHost': '连接无法确认关闭，需要重启 Harness 才能彻底恢复。',
      'hint.loadFailed': '实例加载失败，点「重启」再试；反复失败时检查命令或地址是否正确。',
      'hint.reconnecting': '正在自动重连，可以先等待；持续失败时点「重启」。',
      'form.createTitle': '新建 MCP 服务器',
      'form.editTitle': '编辑「{name}」',
      'form.name': '名称',
      'form.nameHint': '字母、数字、下划线或短横线，1–32 位。工具名会变成 mcp__名称__工具。',
      'form.nameRequired': '请填写名称。',
      'form.nameInvalid': '名称只能包含字母、数字、下划线或短横线，长度 1–32。',
      'form.renameWarning': '改名会让模型看到的工具名从 mcp__{from}__* 变成 mcp__{to}__*，并短暂断开后重连。',
      'form.transport': '接入方式',
      'form.transport.stdio': '本地命令',
      'form.transport.http': 'HTTP 端点',
      'form.command': '启动命令',
      'form.commandHint': '例如 npx、uvx 或某个可执行文件的完整路径。',
      'form.commandRequired': '请填写启动命令。',
      'form.args': '命令参数',
      'form.argsHint': '每行一个参数，不做 shell 转义展开。',
      'form.cwd': '工作目录',
      'form.cwdHint': '可选，子进程的工作目录。',
      'form.env': '环境变量',
      'form.envHint': '每行 KEY=VALUE。值可以用 ${credential:名称} 引用凭据。',
      'form.url': '服务器地址',
      'form.urlHint': '例如 https://example.com/mcp。',
      'form.urlRequired': '请填写服务器地址。',
      'form.urlInvalid': '地址必须是完整的 http(s) URL。',
      'form.headers': '请求头',
      'form.headersHint': '每行 KEY=VALUE。值可以用 ${credential:名称} 引用凭据。',
      'form.enabled': '启用此服务器',
      'form.enabledHint': '关闭后保留配置，但不再连接，工具也会从模型中移除。',
      'form.timeout': '单次工具调用超时（毫秒）',
      'form.timeoutHint': '留空使用默认值。',
      'form.secretHint': '值默认隐藏，点「显示值」后再编辑。',
      'confirm.deleteTitle': '删除「{name}」？',
      'confirm.deleteBody': '删除后这条配置从本机移除，服务器的工具会从模型中消失。相关的凭据不受影响。',
      'confirm.deleteInheritedBody': '「{name}」来自下层配置（bundle 或 profile 基线）。删除只会停用它，因为它会被下层重新提供。',
      'confirm.deleteRemovedBody': '「{name}」是上一次删除留下的残留记录，重启 Harness 后自动消失。',
      'confirm.confirm': '删除',
      'confirm.disable': '停用',
      'error.generic': '操作没有完成，请再试一次。',
      'error.withDetail': '操作没有完成：{message}',
      'error.unknown-server': '这个服务器已经不存在了，列表已刷新。',
      'error.invalid-name': '名称只能包含字母、数字、下划线或短横线，长度 1–32。',
      'error.name-taken': '已经有同名服务器，请换一个名称。',
      'error.missing-command': '本地命令需要填写启动命令。',
      'error.missing-url': 'HTTP 端点需要填写地址。',
      'error.invalid-url': '地址必须是完整的 http(s) URL。',
      'error.invalid-transport': '接入方式必须是本地命令或 HTTP 端点。',
      'error.registered-readonly': '这个服务器由插件在运行期注册，面板不能修改或删除它。',
      'error.removed-readonly': '这是上次删除遗留的记录，重启 Harness 后才能重新添加同名服务器。',
      'error.no-manager': '当前 profile 没有挂载 MCP 管理器，页面只能查看空列表。',
      'error.no-editor': '当前 profile 没有配置编辑器，无法保存 MCP 服务器。',
      'error.no-row': '当前 profile 里没有 MCP 管理器的配置行，无法保存。',
      'error.forbidden': '请求来源未通过浏览器信任校验，请从 Harness 页面打开面板。',
      'error.unauthenticated': '浏览器会话已失效，请刷新 Harness 页面。',
      'error.bridge': '无法连接 Harness 后台：{message}。请稍后重试；一直失败说明后台没有加载本插件。',
      'error.body-too-large': '提交的内容太大，请减少参数行数后再保存。',
      'error.unknown-method': '面板与后台版本不一致，请刷新页面。',
      'probe.title': '连接测试：{name}',
      'probe.ok': '连接成功',
      'probe.fail': '连接失败（阶段：{stage}）',
      'probe.tools': '发现 {count} 个工具',
      'probe.noTools': '服务器没有声明工具',
      'probe.truncated': '列表已截断',
      'probe.duration': '耗时 {value}',
      'probe.closeFailed': '连接已建立，但无法确认关闭，建议重启 Harness。',
      'probe.close': '关闭',
      'probe.stage.connect': '连接',
      'probe.stage.list': '列出工具',
      'probe.stage.cleanup': '清理',
      'unit.seconds': '{value} 秒',
      'unit.ms': '{value} 毫秒',
      'loading': '加载中…',
      'notice.saved': '已保存「{name}」。',
      'notice.deleted': '已删除「{name}」。',
      'notice.inherited-disabled': '「{name}」来自下层配置，面板无法删除，已改为停用。',
    }

    const DICT_EN = {
      'panel.label': 'MCP servers',
      'page.title': 'MCP servers',
      'page.subtitle': 'The MCP server page opened from the sidebar: see connection state, add, edit, toggle, test and delete servers. These writes are the same configuration Settings edits.',
      'page.count': '{count} servers',
      'page.connected': '{count} connected',
      'page.updatedAt': 'Updated {time}',
      'action.add': 'New server',
      'action.refresh': 'Refresh',
      'action.edit': 'Edit',
      'action.delete': 'Delete',
      'action.restart': 'Restart',
      'action.probe': 'Test connection',
      'action.cancel': 'Cancel',
      'action.save': 'Save',
      'action.saving': 'Saving…',
      'action.probing': 'Testing…',
      'action.restarting': 'Restarting…',
      'action.details': 'Details',
      'action.hide': 'Hide',
      'action.showValues': 'Show values',
      'action.hideValues': 'Hide values',
      'empty.title': 'No MCP servers yet',
      'empty.body': 'Add an MCP server and its tools become available to the model as mcp__name__tool. You can disable or delete it at any time.',
      'empty.hint': 'Local commands (stdio) and HTTP endpoints (streamable-http) are supported. MCP servers hard-wired in a bundle or cordis.yml do not appear here; add them as entries.',
      'state.connected': 'Connected',
      'state.connecting': 'Connecting',
      'state.reconnecting': 'Reconnecting',
      'state.waiting-credentials': 'Waiting for credentials',
      'state.disabled': 'Disabled',
      'state.failed': 'Failed',
      'state.closed': 'Closed',
      'state.unknown': 'Unknown state',
      'badge.stdio': 'stdio',
      'badge.http': 'HTTP',
      'badge.profile': 'Profile config',
      'badge.inherited': 'Inherited',
      'badge.registered': 'Plugin registered',
      'badge.removed': 'Leftover record',
      'meta.tools': '{count} tools',
      'meta.lastError': 'Last error',
      'meta.command': 'Command',
      'meta.args': 'Arguments',
      'meta.url': 'URL',
      'meta.cwd': 'Working directory',
      'meta.env': 'Environment',
      'meta.headers': 'Headers',
      'meta.timeout': 'Tool call timeout',
      'meta.attempt': 'attempt {attempt}/{max}',
      'hint.registered': 'A plugin registers this server at runtime; the panel can only show its state. Edit it in that plugin’s own configuration.',
      'hint.removed': 'Closure was never confirmed after removal. The leftover record clears on the next Harness restart; until then no server may reuse this name.',
      'hint.credentials': '${credential:NAME} has not resolved yet: add that credential, or put the value in the entry directly.',
      'hint.restart': 'The reconnect budget is exhausted. Use Restart to rebuild the connection.',
      'hint.reconnectOff': 'Automatic reconnect is off for this entry. Restart it, or edit the entry and enable reconnect.',
      'hint.restartHost': 'Closure could not be confirmed; restarting Harness is the only full recovery.',
      'hint.loadFailed': 'The instance failed to load. Try Restart; if it keeps failing, check the command or URL.',
      'hint.reconnecting': 'Reconnecting automatically. Wait a moment; use Restart if it keeps failing.',
      'form.createTitle': 'New MCP server',
      'form.editTitle': 'Edit “{name}”',
      'form.name': 'Name',
      'form.nameHint': 'Letters, digits, underscore or dash, 1–32 characters. Tools are named mcp__name__tool.',
      'form.nameRequired': 'Enter a name.',
      'form.nameInvalid': 'The name may contain letters, digits, underscore or dash, 1–32 characters.',
      'form.renameWarning': 'Renaming changes the model-facing tools from mcp__{from}__* to mcp__{to}__*, and reconnects the server briefly.',
      'form.transport': 'Transport',
      'form.transport.stdio': 'Local command',
      'form.transport.http': 'HTTP endpoint',
      'form.command': 'Command',
      'form.commandHint': 'For example npx, uvx, or the absolute path of an executable.',
      'form.commandRequired': 'Enter the command.',
      'form.args': 'Arguments',
      'form.argsHint': 'One argument per line, passed without shell interpolation.',
      'form.cwd': 'Working directory',
      'form.cwdHint': 'Optional working directory for the child process.',
      'form.env': 'Environment',
      'form.envHint': 'One KEY=VALUE per line. Values may reference credentials as ${credential:NAME}.',
      'form.url': 'Server URL',
      'form.urlHint': 'For example https://example.com/mcp.',
      'form.urlRequired': 'Enter the server URL.',
      'form.urlInvalid': 'The URL must be a complete http(s) URL.',
      'form.headers': 'Headers',
      'form.headersHint': 'One KEY=VALUE per line. Values may reference credentials as ${credential:NAME}.',
      'form.enabled': 'Enable this server',
      'form.enabledHint': 'Disabled keeps the configuration but stops connecting and removes its tools.',
      'form.timeout': 'Tool call timeout (ms)',
      'form.timeoutHint': 'Leave empty for the default.',
      'form.secretHint': 'Values are hidden by default; choose Show values to edit them.',
      'confirm.deleteTitle': 'Delete “{name}”?',
      'confirm.deleteBody': 'The entry is removed from this machine and its tools leave the model. Credentials are not affected.',
      'confirm.deleteInheritedBody': '“{name}” comes from a lower configuration layer, so deleting only disables it — the base layer would provide it again.',
      'confirm.deleteRemovedBody': '“{name}” is a leftover record from an earlier removal; it disappears when Harness restarts.',
      'confirm.confirm': 'Delete',
      'confirm.disable': 'Disable',
      'error.generic': 'The operation did not finish. Try again.',
      'error.withDetail': 'The operation did not finish: {message}',
      'error.unknown-server': 'That server no longer exists; the list was refreshed.',
      'error.invalid-name': 'The name may contain letters, digits, underscore or dash, 1–32 characters.',
      'error.name-taken': 'A server with that name already exists. Choose another name.',
      'error.missing-command': 'A local command server needs its command.',
      'error.missing-url': 'An HTTP endpoint needs its URL.',
      'error.invalid-url': 'The URL must be a complete http(s) URL.',
      'error.invalid-transport': 'The transport must be a local command or an HTTP endpoint.',
      'error.registered-readonly': 'A plugin registers this server at runtime; the panel cannot edit or delete it.',
      'error.removed-readonly': 'This is a leftover record from an earlier removal. Restart Harness before reusing the name.',
      'error.no-manager': 'This profile does not mount the MCP manager, so the list stays empty.',
      'error.no-editor': 'This profile has no configuration editor, so nothing can be saved.',
      'error.no-row': 'This profile has no MCP manager row, so nothing can be saved.',
      'error.forbidden': 'The request did not pass the browser trust check. Open the panel from the Harness page.',
      'error.unauthenticated': 'The browser session expired. Refresh the Harness page.',
      'error.bridge': 'Cannot reach the Harness Host: {message}. Retry in a moment; if it keeps failing the Host has not loaded this plugin.',
      'error.body-too-large': 'The payload is too large. Remove some argument lines and save again.',
      'error.unknown-method': 'The panel and the Host disagree on the protocol. Refresh the page.',
      'probe.title': 'Connection test: {name}',
      'probe.ok': 'Connected',
      'probe.fail': 'Connection failed (stage: {stage})',
      'probe.tools': 'Found {count} tools',
      'probe.noTools': 'The server declares no tools',
      'probe.truncated': 'List truncated',
      'probe.duration': 'Took {value}',
      'probe.closeFailed': 'Connected, but closure was not confirmed — restart Harness.',
      'probe.close': 'Close',
      'probe.stage.connect': 'connect',
      'probe.stage.list': 'list tools',
      'probe.stage.cleanup': 'clean up',
      'unit.seconds': '{value} s',
      'unit.ms': '{value} ms',
      'loading': 'Loading…',
      'notice.saved': 'Saved “{name}”.',
      'notice.deleted': 'Deleted “{name}”.',
      'notice.inherited-disabled': '“{name}” comes from a lower configuration layer; it was disabled instead of deleted.',
    }

    const CSS = `
.mcpui-page{position:relative;display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family,system-ui);font-size:13.5px}
.mcpui-scroll{flex:1;min-height:0;overflow:auto;padding:calc(var(--dsh-frame-top-clearance,0px) + 16px) 28px 40px}
.mcpui-inner{max-width:920px;margin:0 auto;display:flex;flex-direction:column;gap:16px}
.mcpui-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.mcpui-headText{display:flex;flex-direction:column;gap:6px;min-width:0}
.mcpui-title{font-size:20px;font-weight:600;line-height:1.3;margin:0}
.mcpui-subtitle{margin:0;color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:1.6;max-width:640px}
.mcpui-headActions{display:flex;align-items:center;gap:8px;flex:none}
.mcpui-metaRow{display:flex;align-items:center;gap:10px;color:var(--dsw-alias-label-tertiary);font-size:12px;flex-wrap:wrap}
.mcpui-dot{width:7px;height:7px;border-radius:50%;flex:none;background:var(--dsw-alias-state-idle-primary)}
.mcpui-dot[data-tone="ok"]{background:var(--dsw-alias-state-success-primary)}
.mcpui-dot[data-tone="warn"]{background:var(--dsw-alias-state-warn-primary)}
.mcpui-dot[data-tone="bad"]{background:var(--dsw-alias-state-error-primary)}
.mcpui-list{display:flex;flex-direction:column;gap:8px}
.mcpui-card{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;display:flex;flex-direction:column}
.mcpui-card[data-dim="true"]{opacity:.72}
.mcpui-row{display:flex;align-items:center;gap:12px;padding:12px 14px;min-width:0}
.mcpui-rowMain{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}
.mcpui-nameLine{display:flex;align-items:center;gap:8px;min-width:0;flex-wrap:wrap}
.mcpui-name{font-size:14px;font-weight:600;letter-spacing:.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:320px}
.mcpui-badge{font-size:11.5px;line-height:20px;height:22px;padding:0 9px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l2);white-space:nowrap;display:inline-flex;align-items:center}
.mcpui-badge[data-kind="transport"]{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dsw-alias-label-primary)}
.mcpui-badge[data-tone="bad"]{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}
.mcpui-sub{color:var(--dsw-alias-label-tertiary);font-size:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
.mcpui-subMono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:380px}
.mcpui-actions{display:flex;align-items:center;gap:6px;flex:none}
.mcpui-btn{appearance:none;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);height:30px;padding:0 11px;border-radius:8px;font-size:12.5px;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;transition:background .12s ease}
.mcpui-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.mcpui-btn:disabled{opacity:.5;cursor:default}
.mcpui-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.mcpui-btn[data-variant="primary"]{background:var(--dsw-alias-button-primary-fill);border-color:transparent;color:var(--dsw-alias-label-primary-foreground,#fff);height:32px;padding:0 14px}
.mcpui-btn[data-variant="primary"]:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}
.mcpui-btn[data-variant="danger"]{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}
.mcpui-btn[data-variant="danger"]:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger)}
.mcpui-btn[data-variant="ghost"]{background:transparent;border-color:transparent;color:var(--dsw-alias-label-secondary)}
.mcpui-btn[data-variant="ghost"]:hover:not(:disabled){color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.mcpui-switch{position:relative;width:34px;height:20px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-3);cursor:pointer;padding:0;flex:none;transition:background .15s ease,border-color .15s ease}
.mcpui-switch[data-on="true"]{background:var(--dsw-alias-brand-primary);border-color:transparent}
.mcpui-switch:disabled{opacity:.5;cursor:default}
.mcpui-switch:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.mcpui-switchKnob{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:var(--dsw-alias-switch-thumb,#fff);transition:transform .15s ease}
.mcpui-switch[data-on="true"] .mcpui-switchKnob{transform:translateX(14px)}
.mcpui-details{border-top:1px solid var(--dsw-alias-border-l2);padding:12px 14px;display:flex;flex-direction:column;gap:12px}
.mcpui-detailGrid{display:grid;grid-template-columns:96px minmax(0,1fr);gap:8px 14px;font-size:12px}
.mcpui-detailKey{color:var(--dsw-alias-label-tertiary)}
.mcpui-detailValue{min-width:0;overflow-wrap:anywhere;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap}
.mcpui-hintRow{grid-column:1 / -1;display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.6}
.mcpui-hintRow[data-kind="error"]{color:var(--dsw-alias-state-error-primary)}
.mcpui-hintRow[data-kind="warn"]{color:var(--dsw-alias-state-warn-primary)}
.mcpui-detailActions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.mcpui-error{color:var(--dsw-alias-state-error-primary)}
.mcpui-empty{border:1px dashed var(--dsw-alias-border-l2);border-radius:14px;padding:34px 26px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px;background:var(--dsw-alias-bg-layer-1)}
.mcpui-emptyTitle{font-size:14.5px;font-weight:600;margin:0}
.mcpui-emptyBody{margin:0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1.7;max-width:500px}
.mcpui-emptyHint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px}
.mcpui-banner{display:flex;align-items:flex-start;gap:10px;border-radius:10px;padding:10px 12px;font-size:12.5px;line-height:1.6;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}
.mcpui-banner[data-kind="error"]{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}
.mcpui-banner[data-kind="success"]{border-color:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-state-success-primary)}
.mcpui-banner[data-kind="info"]{border-color:var(--dsw-alias-border-l2)}
.mcpui-overlay{position:absolute;inset:0;background:var(--dsw-alias-bg-mask-2);display:flex;align-items:flex-start;justify-content:center;padding:32px 20px;overflow:auto;z-index:20}
.mcpui-sheet{width:min(620px,100%);background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:14px;box-shadow:0 16px 48px var(--dsw-alias-bg-mask-3);display:flex;flex-direction:column;max-height:100%}
.mcpui-sheet[data-width="narrow"]{width:min(430px,100%)}
.mcpui-sheetHead{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.mcpui-sheetTitle{font-size:15px;font-weight:600;margin:0}
.mcpui-form{padding:16px;display:flex;flex-direction:column;gap:14px;overflow:auto}
.mcpui-field{display:flex;flex-direction:column;gap:6px}
.mcpui-label{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary);display:flex;align-items:center;gap:6px}
.mcpui-hint{font-size:12px;color:var(--dsw-alias-label-tertiary);line-height:1.6}
.mcpui-fieldError{font-size:12px;color:var(--dsw-alias-state-error-primary);line-height:1.5}
.mcpui-input,.mcpui-textarea{width:100%;box-sizing:border-box;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px;padding:7px 9px;outline:none;transition:border-color .12s ease}
.mcpui-input:focus,.mcpui-textarea:focus{border-color:var(--dsw-alias-brand-primary)}
.mcpui-input:focus-visible,.mcpui-textarea:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.mcpui-textarea{min-height:64px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;line-height:1.6}
.mcpui-input[data-invalid="true"],.mcpui-textarea[data-invalid="true"]{border-color:var(--dsw-alias-state-error-primary)}
.mcpui-segment{display:inline-flex;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:9px;padding:2px;gap:2px;align-self:flex-start}
.mcpui-segmentBtn{appearance:none;border:none;background:transparent;color:var(--dsw-alias-label-secondary);height:26px;padding:0 12px;border-radius:7px;font-size:12.5px;font-family:inherit;cursor:pointer}
.mcpui-segmentBtn[data-active="true"]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 1px 2px var(--dsw-alias-bg-mask-1)}
.mcpui-segmentBtn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.mcpui-checkRow{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2)}
.mcpui-checkText{display:flex;flex-direction:column;gap:3px}
.mcpui-sheetFoot{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:12px 16px;border-top:1px solid var(--dsw-alias-border-l2)}
.mcpui-probeList{display:flex;flex-direction:column;gap:6px;max-height:240px;overflow:auto;padding:0;margin:0;list-style:none}
.mcpui-probeTool{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--dsw-alias-label-secondary);padding:4px 8px;border-radius:6px;background:var(--dsw-alias-bg-layer-2)}
.mcpui-loading{display:flex;align-items:center;justify-content:center;padding:48px 0;color:var(--dsw-alias-label-tertiary);font-size:12.5px}
.mcpui-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
@media (max-width:1100px){.mcpui-subMono{max-width:240px}}
@media (max-width:820px){.mcpui-scroll{padding-left:16px;padding-right:16px}.mcpui-row{flex-wrap:wrap}.mcpui-actions{width:100%;justify-content:flex-end}}
`

    /**
     * Call one Host operation.
     * @param method - operation name.
     * @param args - operation payload.
     * @returns the operation value; throws an Error carrying `code`.
     */
    async function rpc(method, args) {
      let response
      try {
        response = await fetch(RPC_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ method, args: args ?? {} }),
        })
      } catch (error) {
        const failure = new Error(error instanceof Error ? error.message : String(error))
        failure.code = 'bridge'
        throw failure
      }
      const text = await response.text()
      let body
      try {
        body = JSON.parse(text)
      } catch {
        const failure = new Error(`HTTP ${response.status}: ${text.slice(0, 160)}`)
        failure.code = 'bridge'
        throw failure
      }
      if (!response.ok || body?.ok === false) {
        const failure = new Error(body?.error?.message ?? `HTTP ${response.status}`)
        failure.code = body?.error?.code ?? 'operation-failed'
        throw failure
      }
      return body.value
    }

    /**
     * Interpolate `{name}` placeholders.
     * @param text - template.
     * @param vars - values.
     * @returns the filled text.
     */
    function fill(text, vars) {
      return String(text).replace(/\{(\w+)\}/g, (match, key) => (vars !== undefined && Object.hasOwn(vars, key) ? String(vars[key]) : match))
    }

    /**
     * Status tone for the dot and label color.
     * @param state - published state.
     * @returns ok | warn | bad | idle.
     */
    function toneOf(state) {
      if (state === 'connected') return 'ok'
      if (state === 'connecting' || state === 'reconnecting' || state === 'waiting-credentials') return 'warn'
      if (state === 'failed') return 'bad'
      return 'idle'
    }

    /**
     * Format a duration with the active locale's unit words.
     * @param t - translate function.
     * @param ms - milliseconds.
     * @returns display text.
     */
    function formatMs(t, ms) {
      if (!Number.isFinite(ms)) return ''
      return ms >= 1000 ? fill(t('unit.seconds'), { value: Math.round(ms / 100) / 10 }) : fill(t('unit.ms'), { value: ms })
    }

    /**
     * Localize one error, keeping the Host diagnostic as a detail.
     * @param t - translate function.
     * @param error - caught value.
     * @returns user-facing text.
     */
    function errorText(t, error) {
      const code = error !== null && typeof error === 'object' ? error.code : undefined
      const message = error instanceof Error ? error.message : String(error ?? '')
      if (typeof code === 'string') {
        const key = 'error.' + code
        const translated = t(key)
        if (translated !== key) return code === 'bridge' ? fill(translated, { message }) : translated
      }
      return message === '' ? t('error.generic') : fill(t('error.withDetail'), { message })
    }

    /**
     * Bind one namespace and re-render on locale changes.
     * @param ctx - client context.
     * @returns the translate function.
     */
    function useT(ctx) {
      const [, setTick] = React.useState(0)
      React.useEffect(() => {
        const unsubscribe = ctx.locale.subscribe(() => setTick((value) => value + 1))
        return () => {
          if (typeof unsubscribe === 'function') unsubscribe()
        }
      }, [ctx])
      return ctx.locale.bind(NS)
    }

    /**
     * Trap focus inside a sheet, close it on Escape, and restore focus on
     * unmount. The close callback is captured once: it only clears a state
     * slot, so a stale closure is harmless.
     * @param ref - the sheet element ref.
     * @param onClose - called on Escape.
     */
    function useSheetFocus(ref, onClose) {
      React.useEffect(() => {
        const root = ref.current
        if (root === null || root === undefined) return undefined
        const previous = document.activeElement
        const focusables = () =>
          Array.prototype.slice
            .call(root.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[href],[tabindex]:not([tabindex="-1"])'))
            .filter((element) => element.offsetParent !== null || element === document.activeElement)
        const first = focusables()[0]
        if (first !== undefined && typeof first.focus === 'function') first.focus()
        const onKeyDown = (event) => {
          if (event.key === 'Escape') {
            event.stopPropagation()
            onClose()
            return
          }
          if (event.key !== 'Tab') return
          const items = focusables()
          if (items.length === 0) return
          const index = items.indexOf(document.activeElement)
          if (event.shiftKey && index <= 0) {
            event.preventDefault()
            items[items.length - 1].focus()
          } else if (!event.shiftKey && index === items.length - 1) {
            event.preventDefault()
            items[0].focus()
          }
        }
        root.addEventListener('keydown', onKeyDown)
        return () => {
          root.removeEventListener('keydown', onKeyDown)
          if (previous !== null && previous !== undefined && typeof previous.focus === 'function') previous.focus()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])
    }

    /**
     * The sidebar glyph: two stacked server boxes joined by a link.
     * @param props - shell share: square edge and selection state.
     * @returns the glyph.
     */
    function PanelIcon(props) {
      const size = props !== null && typeof props === 'object' && Number.isFinite(props.size) ? props.size : 16
      return h(
        'svg',
        {
          'data-dsh-panel-entry': PANEL_ID,
          viewBox: '0 0 16 16',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
        },
        h('rect', { x: 2.4, y: 2.2, width: 11.2, height: 4.2, rx: 1.2 }),
        h('rect', { x: 2.4, y: 9.6, width: 11.2, height: 4.2, rx: 1.2 }),
        h('path', { d: 'M5.2 6.4v1.6h5.6V6.4' }),
      )
    }

    /**
     * One-line explanation of what a server's current state means for the user.
     * @param t - translate function.
     * @param server - list row.
     * @returns the hint text, or null.
     */
    function statusHint(t, server) {
      if (server.source === 'removed') return t('hint.removed')
      if (server.source === 'registered') return t('hint.registered')
      const status = server.status ?? {}
      if (status.state === 'waiting-credentials') return t('hint.credentials')
      if (status.state === 'reconnecting') return t('hint.reconnecting')
      if (status.state === 'failed') {
        if (status.reason === 'gave-up') return t('hint.restart')
        if (status.reason === 'reconnect-disabled') return t('hint.reconnectOff')
        if (status.reason === 'load') return t('hint.loadFailed')
        if (status.reason === 'cleanup' || status.reason === 'unclosed-generation') return t('hint.restartHost')
        return t('hint.restart')
      }
      return null
    }

    /**
     * One server row plus its expandable details and secondary actions.
     * @param props - row share.
     * @returns the card.
     */
    function ServerCard(props) {
      const { server, t, rowBusy, expanded, onToggle, onRestart, onProbe, onEdit, onDelete, onExpand } = props
      const status = server.status ?? {}
      const state = typeof status.state === 'string' ? status.state : 'unknown'
      const stateKey = 'state.' + (STATES.has(state) ? state : 'unknown')
      const tone = toneOf(state)
      const source = SOURCES.has(server.source) ? server.source : 'profile'
      const sourceKey = 'badge.' + source
      const editable = server.source !== 'registered' && server.source !== 'removed'
      const toolCount = state === 'connected' && Number.isFinite(status.toolCount) ? status.toolCount : undefined
      const attempt =
        state === 'reconnecting' && Number.isFinite(status.attempt) && Number.isFinite(status.maxAttempts)
          ? fill(t('meta.attempt'), { attempt: status.attempt, max: status.maxAttempts })
          : ''
      const endpoint = (server.transport === 'stdio' ? server.command : server.url) || '—'
      const argsLine = server.transport === 'stdio' && server.args.length > 0 ? ' ' + server.args.join(' ') : ''
      const hint = statusHint(t, server)
      const canRestart = editable
      const canProbe = server.source !== 'removed'
      const rows = []
      rows.push(h('span', { key: 'endpoint-k', className: 'mcpui-detailKey' }, t(server.transport === 'stdio' ? 'meta.command' : 'meta.url')))
      rows.push(h('span', { key: 'endpoint-v', className: 'mcpui-detailValue' }, server.transport === 'stdio' ? server.command || '—' : server.url || '—'))
      if (server.transport === 'stdio' && server.args.length > 0) {
        rows.push(h('span', { key: 'args-k', className: 'mcpui-detailKey' }, t('meta.args')))
        rows.push(h('span', { key: 'args-v', className: 'mcpui-detailValue' }, server.args.join('\n')))
      }
      if (server.transport === 'stdio' && server.cwd !== '') {
        rows.push(h('span', { key: 'cwd-k', className: 'mcpui-detailKey' }, t('meta.cwd')))
        rows.push(h('span', { key: 'cwd-v', className: 'mcpui-detailValue' }, server.cwd))
      }
      if (server.envKeys.length > 0) {
        rows.push(h('span', { key: 'env-k', className: 'mcpui-detailKey' }, t('meta.env')))
        rows.push(h('span', { key: 'env-v', className: 'mcpui-detailValue' }, server.envKeys.join('\n')))
      }
      if (server.headerKeys.length > 0) {
        rows.push(h('span', { key: 'hdr-k', className: 'mcpui-detailKey' }, t('meta.headers')))
        rows.push(h('span', { key: 'hdr-v', className: 'mcpui-detailValue' }, server.headerKeys.join('\n')))
      }
      if (Number.isFinite(server.toolCallTimeoutMs)) {
        rows.push(h('span', { key: 'to-k', className: 'mcpui-detailKey' }, t('meta.timeout')))
        rows.push(h('span', { key: 'to-v', className: 'mcpui-detailValue' }, formatMs(t, server.toolCallTimeoutMs)))
      }
      if (typeof status.lastError === 'string' && status.lastError !== '') {
        rows.push(h('span', { key: 'err-k', className: 'mcpui-detailKey' }, t('meta.lastError')))
        rows.push(h('span', { key: 'err-v', className: 'mcpui-detailValue mcpui-error' }, status.lastError))
      }
      if (hint !== null) {
        rows.push(h('div', { key: 'hint', className: 'mcpui-hintRow', 'data-kind': tone === 'bad' ? 'error' : tone === 'warn' ? 'warn' : 'info' }, hint))
      }
      return h(
        'div',
        { className: 'mcpui-card', 'data-dim': String(server.enabled === false || source === 'removed') },
        h(
          'div',
          { className: 'mcpui-row' },
          h('span', { className: 'mcpui-dot', 'data-tone': tone, 'aria-hidden': 'true' }),
          h(
            'div',
            { className: 'mcpui-rowMain' },
            h(
              'div',
              { className: 'mcpui-nameLine' },
              h('span', { className: 'mcpui-name', title: server.name }, server.name),
              h('span', { className: 'mcpui-badge', 'data-kind': 'transport' }, t(server.transport === 'stdio' ? 'badge.stdio' : 'badge.http')),
              h('span', { className: 'mcpui-badge', 'data-tone': source === 'removed' ? 'bad' : undefined }, t(sourceKey)),
            ),
            h(
              'div',
              { className: 'mcpui-sub' },
              h(
                'span',
                { style: tone === 'bad' ? { color: 'var(--dsw-alias-state-error-primary)' } : tone === 'warn' ? { color: 'var(--dsw-alias-state-warn-primary)' } : undefined },
                t(stateKey),
              ),
              attempt === '' ? null : h('span', null, attempt),
              toolCount === undefined ? null : h('span', null, fill(t('meta.tools'), { count: toolCount })),
              h('span', { className: 'mcpui-subMono', title: endpoint + argsLine }, endpoint + argsLine),
            ),
          ),
          h(
            'div',
            { className: 'mcpui-actions' },
            h(
              'button',
              {
                type: 'button',
                className: 'mcpui-switch',
                role: 'switch',
                'aria-checked': String(server.enabled !== false),
                'aria-label': server.name + ': ' + t('form.enabled'),
                'data-on': String(server.enabled !== false),
                disabled: rowBusy || !editable,
                onClick: () => onToggle(server, server.enabled === false),
                title: t('form.enabled'),
              },
              h('span', { className: 'mcpui-switchKnob' }),
            ),
            h(
              'button',
              { type: 'button', className: 'mcpui-btn', disabled: rowBusy || !editable, onClick: () => onEdit(server), title: t('action.edit') },
              t('action.edit'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'mcpui-btn',
                'data-variant': 'ghost',
                onClick: () => onExpand(server),
                'aria-expanded': String(expanded),
              },
              expanded ? t('action.hide') : t('action.details'),
            ),
          ),
        ),
        expanded
          ? h(
              'div',
              { className: 'mcpui-details' },
              h('div', { className: 'mcpui-detailGrid' }, rows),
              h(
                'div',
                { className: 'mcpui-detailActions' },
                h(
                  'button',
                  { type: 'button', className: 'mcpui-btn', disabled: rowBusy || !canProbe, onClick: () => onProbe(server) },
                  rowBusy === 'probe' ? t('action.probing') : t('action.probe'),
                ),
                h(
                  'button',
                  { type: 'button', className: 'mcpui-btn', disabled: rowBusy || !canRestart, onClick: () => onRestart(server) },
                  rowBusy === 'restart' ? t('action.restarting') : t('action.restart'),
                ),
                h(
                  'button',
                  { type: 'button', className: 'mcpui-btn', 'data-variant': 'danger', disabled: rowBusy || !editable, onClick: () => onDelete(server) },
                  t('action.delete'),
                ),
              ),
            )
          : null,
      )
    }

    /**
     * The delete confirmation. It states the consequence before the button is
     * live, and disables confirmation for entries that cannot be removed.
     * @param props - confirm share.
     * @returns the modal sheet.
     */
    function ConfirmSheet(props) {
      const { t, server, busy, onCancel, onConfirm } = props
      const ref = React.useRef(null)
      useSheetFocus(ref, onCancel)
      const inherited = server.source === 'inherited'
      const removed = server.source === 'removed'
      const body = removed ? t('confirm.deleteRemovedBody') : inherited ? fill(t('confirm.deleteInheritedBody'), { name: server.name }) : t('confirm.deleteBody')
      return h(
        'div',
        { className: 'mcpui-overlay', role: 'presentation' },
        h(
          'div',
          { className: 'mcpui-sheet', 'data-width': 'narrow', role: 'dialog', 'aria-modal': 'true', 'aria-label': fill(t('confirm.deleteTitle'), { name: server.name }), ref },
          h(
            'div',
            { className: 'mcpui-sheetHead' },
            h('h2', { className: 'mcpui-sheetTitle' }, fill(t('confirm.deleteTitle'), { name: server.name })),
          ),
          h('div', { className: 'mcpui-form' }, h('p', { className: 'mcpui-hint', style: { margin: 0 } }, body)),
          h(
            'div',
            { className: 'mcpui-sheetFoot' },
            h('button', { type: 'button', className: 'mcpui-btn', onClick: onCancel }, t('action.cancel')),
            h(
              'button',
              {
                type: 'button',
                className: 'mcpui-btn',
                'data-variant': 'danger',
                disabled: busy || removed,
                onClick: onConfirm,
              },
              busy ? t('loading') : inherited ? t('confirm.disable') : t('confirm.confirm'),
            ),
          ),
        ),
      )
    }

    /**
     * The create/edit form.
     * @param props - form share.
     * @returns the modal sheet.
     */
    function EditorSheet(props) {
      const { t, draft, busy, hostError, onCancel, onSubmit } = props
      const [form, setForm] = React.useState(draft.form)
      const [fieldErrors, setFieldErrors] = React.useState({})
      const [showSecrets, setShowSecrets] = React.useState(false)
      const ref = React.useRef(null)
      useSheetFocus(ref, onCancel)
      const set = (patch) => {
        setForm((current) => ({ ...current, ...patch }))
        setFieldErrors((current) => {
          const next = { ...current }
          for (const key of Object.keys(patch)) delete next[key]
          return next
        })
      }
      const validate = () => {
        const errors = {}
        if (form.name.trim() === '') errors.name = t('form.nameRequired')
        else if (!/^[A-Za-z0-9_-]{1,32}$/.test(form.name.trim())) errors.name = t('form.nameInvalid')
        if (form.transport === 'stdio' && form.command.trim() === '') errors.command = t('form.commandRequired')
        if (form.transport === 'streamable-http') {
          if (form.url.trim() === '') errors.url = t('form.urlRequired')
          else {
            try {
              const parsed = new URL(form.url.trim())
              if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') errors.url = t('form.urlInvalid')
            } catch {
              errors.url = t('form.urlInvalid')
            }
          }
        }
        return errors
      }
      const submit = (event) => {
        event.preventDefault()
        const errors = validate()
        if (Object.keys(errors).length > 0) {
          setFieldErrors(errors)
          const firstKey = Object.keys(errors)[0]
          const target = ref.current?.querySelector('[data-field="' + firstKey + '"]')
          if (target !== null && target !== undefined && typeof target.focus === 'function') target.focus()
          return
        }
        onSubmit({
          name: form.name.trim(),
          renameFrom: draft.renameFrom,
          entry: {
            transport: form.transport,
            enabled: form.enabled,
            command: form.command,
            args: form.args,
            cwd: form.cwd,
            env: form.env,
            url: form.url,
            headers: form.headers,
            toolCallTimeoutMs: form.toolCallTimeoutMs,
          },
        })
      }
      const maskText = (text) =>
        String(text)
          .split('\n')
          .map((line) => {
            const index = line.indexOf('=')
            return index < 0 ? line : line.slice(0, index + 1) + '••••'
          })
          .join('\n')
      const recordField = (key, label, hint, value, placeholder) =>
        h(
          'div',
          { className: 'mcpui-field', key },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
            h('label', { className: 'mcpui-label', htmlFor: 'mcpui-' + key, id: 'mcpui-' + key + '-label' }, label),
            String(value).trim() === ''
              ? null
              : h(
                  'button',
                  { type: 'button', className: 'mcpui-btn', 'data-variant': 'ghost', onClick: () => setShowSecrets((current) => !current) },
                  showSecrets ? t('action.hideValues') : t('action.showValues'),
                ),
          ),
          h('textarea', {
            id: 'mcpui-' + key,
            'data-field': key,
            className: 'mcpui-textarea',
            value: showSecrets ? value : maskText(value),
            readOnly: !showSecrets,
            spellCheck: false,
            placeholder: showSecrets ? placeholder : '',
            onChange: (event) => set({ [key]: event.target.value }),
          }),
          h('span', { className: 'mcpui-hint' }, showSecrets ? hint : hint + ' ' + t('form.secretHint')),
        )
      const renameChanged = draft.renameFrom !== '' && form.name.trim() !== draft.renameFrom
      return h(
        'div',
        { className: 'mcpui-overlay', role: 'presentation' },
        h(
          'form',
          {
            className: 'mcpui-sheet',
            ref,
            onSubmit: submit,
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': draft.renameFrom === '' ? t('form.createTitle') : fill(t('form.editTitle'), { name: draft.renameFrom }),
          },
          h(
            'div',
            { className: 'mcpui-sheetHead' },
            h('h2', { className: 'mcpui-sheetTitle' }, draft.renameFrom === '' ? t('form.createTitle') : fill(t('form.editTitle'), { name: draft.renameFrom })),
            h('button', { type: 'button', className: 'mcpui-btn', 'data-variant': 'ghost', onClick: onCancel }, t('action.cancel')),
          ),
          h(
            'div',
            { className: 'mcpui-form' },
            hostError === null ? null : h('div', { className: 'mcpui-banner', 'data-kind': 'error', role: 'alert' }, hostError),
            h(
              'div',
              { className: 'mcpui-field' },
              h('label', { className: 'mcpui-label', htmlFor: 'mcpui-name' }, t('form.name')),
              h('input', {
                id: 'mcpui-name',
                'data-field': 'name',
                className: 'mcpui-input',
                value: form.name,
                'data-invalid': String(fieldErrors.name !== undefined),
                'aria-invalid': String(fieldErrors.name !== undefined),
                'aria-describedby': 'mcpui-name-hint',
                spellCheck: false,
                autoComplete: 'off',
                onChange: (event) => set({ name: event.target.value }),
              }),
              fieldErrors.name === undefined ? null : h('span', { className: 'mcpui-fieldError', role: 'alert' }, fieldErrors.name),
              h('span', { className: 'mcpui-hint', id: 'mcpui-name-hint' }, t('form.nameHint')),
              renameChanged ? h('span', { className: 'mcpui-hint', style: { color: 'var(--dsw-alias-state-warn-primary)' } }, fill(t('form.renameWarning'), { from: draft.renameFrom, to: form.name.trim() })) : null,
            ),
            h(
              'div',
              { className: 'mcpui-field' },
              h('span', { className: 'mcpui-label' }, t('form.transport')),
              h(
                'div',
                { className: 'mcpui-segment', role: 'group', 'aria-label': t('form.transport') },
                ['stdio', 'streamable-http'].map((transport) =>
                  h(
                    'button',
                    {
                      key: transport,
                      type: 'button',
                      className: 'mcpui-segmentBtn',
                      'data-active': String(form.transport === transport),
                      'aria-pressed': String(form.transport === transport),
                      onClick: () => set({ transport }),
                    },
                    t(transport === 'stdio' ? 'form.transport.stdio' : 'form.transport.http'),
                  ),
                ),
              ),
            ),
            form.transport === 'stdio'
              ? [
                  h(
                    'div',
                    { key: 'command', className: 'mcpui-field' },
                    h('label', { className: 'mcpui-label', htmlFor: 'mcpui-command' }, t('form.command')),
                    h('input', {
                      id: 'mcpui-command',
                      'data-field': 'command',
                      className: 'mcpui-input mcpui-mono',
                      value: form.command,
                      'data-invalid': String(fieldErrors.command !== undefined),
                      'aria-invalid': String(fieldErrors.command !== undefined),
                      spellCheck: false,
                      autoComplete: 'off',
                      placeholder: 'npx',
                      onChange: (event) => set({ command: event.target.value }),
                    }),
                    fieldErrors.command === undefined ? null : h('span', { className: 'mcpui-fieldError', role: 'alert' }, fieldErrors.command),
                    h('span', { className: 'mcpui-hint' }, t('form.commandHint')),
                  ),
                  h(
                    'div',
                    { key: 'args', className: 'mcpui-field' },
                    h('label', { className: 'mcpui-label', htmlFor: 'mcpui-args' }, t('form.args')),
                    h('textarea', {
                      id: 'mcpui-args',
                      className: 'mcpui-textarea',
                      value: form.args,
                      spellCheck: false,
                      placeholder: '-y\n@modelcontextprotocol/server-filesystem\nD:\\\\work',
                      onChange: (event) => set({ args: event.target.value }),
                    }),
                    h('span', { className: 'mcpui-hint' }, t('form.argsHint')),
                  ),
                  h(
                    'div',
                    { key: 'cwd', className: 'mcpui-field' },
                    h('label', { className: 'mcpui-label', htmlFor: 'mcpui-cwd' }, t('form.cwd')),
                    h('input', {
                      id: 'mcpui-cwd',
                      className: 'mcpui-input mcpui-mono',
                      value: form.cwd,
                      spellCheck: false,
                      autoComplete: 'off',
                      onChange: (event) => set({ cwd: event.target.value }),
                    }),
                    h('span', { className: 'mcpui-hint' }, t('form.cwdHint')),
                  ),
                  recordField('env', t('form.env'), t('form.envHint'), form.env, 'GITHUB_TOKEN=${credential:GITHUB_TOKEN}'),
                ]
              : [
                  h(
                    'div',
                    { key: 'url', className: 'mcpui-field' },
                    h('label', { className: 'mcpui-label', htmlFor: 'mcpui-url' }, t('form.url')),
                    h('input', {
                      id: 'mcpui-url',
                      'data-field': 'url',
                      className: 'mcpui-input mcpui-mono',
                      value: form.url,
                      'data-invalid': String(fieldErrors.url !== undefined),
                      'aria-invalid': String(fieldErrors.url !== undefined),
                      spellCheck: false,
                      autoComplete: 'off',
                      placeholder: 'https://example.com/mcp',
                      onChange: (event) => set({ url: event.target.value }),
                    }),
                    fieldErrors.url === undefined ? null : h('span', { className: 'mcpui-fieldError', role: 'alert' }, fieldErrors.url),
                    h('span', { className: 'mcpui-hint' }, t('form.urlHint')),
                  ),
                  recordField('headers', t('form.headers'), t('form.headersHint'), form.headers, 'Authorization=Bearer ${credential:MCP_TOKEN}'),
                ],
            h(
              'div',
              { className: 'mcpui-field' },
              h('label', { className: 'mcpui-label', htmlFor: 'mcpui-timeout' }, t('form.timeout')),
              h('input', {
                id: 'mcpui-timeout',
                className: 'mcpui-input mcpui-mono',
                value: form.toolCallTimeoutMs,
                inputMode: 'numeric',
                spellCheck: false,
                autoComplete: 'off',
                onChange: (event) => set({ toolCallTimeoutMs: event.target.value.replace(/[^0-9]/g, '') }),
              }),
              h('span', { className: 'mcpui-hint' }, t('form.timeoutHint')),
              h('span', { className: 'mcpui-hint' }, t('form.secretHint')),
            ),
            h(
              'div',
              { className: 'mcpui-checkRow' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'mcpui-switch',
                  role: 'switch',
                  'aria-checked': String(form.enabled),
                  'aria-labelledby': 'mcpui-enabled-label',
                  'data-on': String(form.enabled),
                  onClick: () => set({ enabled: !form.enabled }),
                  style: { marginTop: '2px' },
                },
                h('span', { className: 'mcpui-switchKnob' }),
              ),
              h(
                'div',
                { className: 'mcpui-checkText' },
                h('span', { className: 'mcpui-label', id: 'mcpui-enabled-label' }, t('form.enabled')),
                h('span', { className: 'mcpui-hint' }, t('form.enabledHint')),
              ),
            ),
          ),
          h(
            'div',
            { className: 'mcpui-sheetFoot' },
            h('button', { type: 'button', className: 'mcpui-btn', onClick: onCancel, disabled: busy }, t('action.cancel')),
            h('button', { type: 'submit', className: 'mcpui-btn', 'data-variant': 'primary', disabled: busy }, busy ? t('action.saving') : t('action.save')),
          ),
        ),
      )
    }

    /**
     * The probe result sheet.
     * @param props - result share.
     * @returns the modal sheet.
     */
    function ProbeSheet(props) {
      const { t, name, result, onClose } = props
      const ref = React.useRef(null)
      useSheetFocus(ref, onClose)
      const ok = result !== null && typeof result === 'object' && result.ok === true
      const closeFailed = result !== null && typeof result === 'object' && result.closeConfirmed === false
      const stageKey = 'probe.stage.' + String(result?.stage ?? 'connect')
      const stageText = t(stageKey) === stageKey ? String(result?.stage ?? 'connect') : t(stageKey)
      return h(
        'div',
        { className: 'mcpui-overlay', role: 'presentation' },
        h(
          'div',
          { className: 'mcpui-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': fill(t('probe.title'), { name }), ref },
          h(
            'div',
            { className: 'mcpui-sheetHead' },
            h('h2', { className: 'mcpui-sheetTitle' }, fill(t('probe.title'), { name })),
            h('button', { type: 'button', className: 'mcpui-btn', 'data-variant': 'ghost', onClick: onClose }, t('probe.close')),
          ),
          h(
            'div',
            { className: 'mcpui-form' },
            h('div', { className: 'mcpui-banner', 'data-kind': ok ? 'success' : 'error', role: 'status' }, ok ? t('probe.ok') : fill(t('probe.fail'), { stage: stageText })),
            ok
              ? h(
                  'div',
                  { className: 'mcpui-field' },
                  h('span', { className: 'mcpui-label' }, result.toolNames.length > 0 ? fill(t('probe.tools'), { count: result.toolNames.length }) : t('probe.noTools')),
                  result.toolNames.length > 0
                    ? h(
                        'ul',
                        { className: 'mcpui-probeList' },
                        result.toolNames.map((tool) => h('li', { key: tool, className: 'mcpui-probeTool' }, tool)),
                      )
                    : null,
                  result.truncated ? h('span', { className: 'mcpui-hint' }, t('probe.truncated')) : null,
                )
              : h('div', { className: 'mcpui-detailValue mcpui-error' }, String(result?.message ?? '')),
            h('span', { className: 'mcpui-hint' }, fill(t('probe.duration'), { value: formatMs(t, result?.durationMs) })),
            result?.serverInfo !== undefined
              ? h('span', { className: 'mcpui-hint mcpui-mono' }, `${result.serverInfo.name ?? ''} ${result.serverInfo.version ?? ''}`.trim())
              : null,
            closeFailed ? h('div', { className: 'mcpui-banner', 'data-kind': 'error', role: 'alert' }, t('probe.closeFailed')) : null,
          ),
        ),
      )
    }

    /**
     * The center-column page.
     * @param props - slot share (the Host context rides in through `inject`).
     * @returns the page.
     */
    function PanelPage(props) {
      const ctx = props?.ctx
      const t = useT(ctx)
      const [snapshot, setSnapshot] = React.useState({ loading: true, data: null, error: null })
      const [busy, setBusy] = React.useState(null)
      const [notice, setNotice] = React.useState(null)
      const [expanded, setExpanded] = React.useState(null)
      const [editor, setEditor] = React.useState(null)
      const [editorError, setEditorError] = React.useState(null)
      const [confirmTarget, setConfirmTarget] = React.useState(null)
      const [probe, setProbe] = React.useState(null)
      const [updatedAt, setUpdatedAt] = React.useState(null)
      const seq = React.useRef(0)

      /** Accept one snapshot only when no newer request has started. */
      const push = (data) => {
        seq.current += 1
        setSnapshot({ loading: false, data, error: null })
        setUpdatedAt(new Date())
      }

      const refresh = React.useCallback(async () => {
        const mine = seq.current + 1
        seq.current = mine
        try {
          const data = await rpc('status')
          if (mine !== seq.current) return
          setSnapshot({ loading: false, data, error: null })
          setUpdatedAt(new Date())
        } catch (error) {
          if (mine !== seq.current) return
          setSnapshot((current) => ({ loading: false, data: current.data, error: errorText(t, error) }))
        }
      }, [t])

      React.useEffect(() => {
        refresh()
        const timer = setInterval(() => {
          if (document.visibilityState === 'hidden') return
          refresh()
        }, POLL_MS)
        const onVisible = () => {
          if (document.visibilityState === 'visible') refresh()
        }
        document.addEventListener('visibilitychange', onVisible)
        return () => {
          clearInterval(timer)
          document.removeEventListener('visibilitychange', onVisible)
        }
      }, [refresh])

      React.useEffect(() => {
        if (notice === null) return undefined
        const timer = setTimeout(() => setNotice(null), 5000)
        return () => clearTimeout(timer)
      }, [notice])

      const data = snapshot.data
      const servers = Array.isArray(data?.servers) ? data.servers : []
      const connected = servers.filter((server) => server.status?.state === 'connected').length
      const capabilities = data?.capabilities ?? {}
      const rowBusy = (name) => busy !== null && busy.name === name
      const anyBusy = busy !== null

      const run = async (spec) => {
        setBusy({ key: spec.key, name: spec.name ?? null })
        if (spec.clearNotice !== false) setNotice(null)
        try {
          const value = await spec.call()
          if (value !== null && typeof value === 'object' && Array.isArray(value.servers)) push(value)
          if (value !== null && typeof value === 'object' && value.notice !== undefined) {
            const code = value.notice.code
            const key = typeof code === 'string' ? 'notice.' + code : ''
            const translated = key === '' ? key : t(key)
            setNotice({
              kind: value.notice.kind ?? 'info',
              message: translated !== key ? fill(translated, { name: value.notice.name ?? '' }) : String(value.notice.message ?? ''),
            })
          } else if (typeof spec.success === 'string' && spec.success !== '') {
            setNotice({ kind: 'success', message: spec.success })
          }
          return { ok: true, value }
        } catch (error) {
          return { ok: false, error }
        } finally {
          setBusy(null)
        }
      }

      const reportFailure = (error) => setNotice({ kind: 'error', message: errorText(t, error) })

      const toggleServer = async (server, enabled) => {
        const outcome = await run({ key: 'toggle', name: server.name, call: () => rpc('toggle', { name: server.name, enabled }) })
        if (!outcome.ok) reportFailure(outcome.error)
      }

      const restartServer = async (server) => {
        const outcome = await run({ key: 'restart', name: server.name, call: () => rpc('restart', { name: server.name }) })
        if (!outcome.ok) reportFailure(outcome.error)
      }

      const probeServer = async (server) => {
        const outcome = await run({ key: 'probe', name: server.name, call: () => rpc('probe', { name: server.name }) })
        if (!outcome.ok) reportFailure(outcome.error)
        else if (outcome.value?.result !== undefined) setProbe({ name: server.name, result: outcome.value.result })
      }

      const openCreate = () => {
        setEditorError(null)
        setEditor({
          renameFrom: '',
          form: {
            name: '',
            transport: 'stdio',
            command: '',
            args: '',
            cwd: '',
            env: '',
            url: '',
            headers: '',
            enabled: true,
            toolCallTimeoutMs: '',
          },
        })
      }

      const openEdit = async (server) => {
        const outcome = await run({ key: 'detail', name: server.name, call: () => rpc('detail', { name: server.name }), clearNotice: false })
        if (!outcome.ok) {
          reportFailure(outcome.error)
          return
        }
        const entry = outcome.value?.entry ?? {}
        const toLines = (record) =>
          Object.entries(record ?? {})
            .map(([key, raw]) => key + '=' + String(raw ?? ''))
            .join('\n')
        setEditorError(null)
        setEditor({
          renameFrom: server.name,
          form: {
            name: server.name,
            transport: entry.transport === 'streamable-http' ? 'streamable-http' : 'stdio',
            command: entry.command ?? '',
            args: Array.isArray(entry.args) ? entry.args.join('\n') : '',
            cwd: entry.cwd ?? '',
            env: toLines(entry.env),
            url: entry.url ?? '',
            headers: toLines(entry.headers),
            enabled: entry.enabled !== false,
            toolCallTimeoutMs: Number.isFinite(entry.toolCallTimeoutMs) ? String(entry.toolCallTimeoutMs) : '',
          },
        })
      }

      const toRecord = (text) => {
        const out = {}
        for (const line of String(text).split('\n')) {
          const row = line.trim()
          if (row === '') continue
          const index = row.indexOf('=')
          if (index < 0) out[row] = ''
          else out[row.slice(0, index).trim()] = row.slice(index + 1).trim()
        }
        return out
      }

      const submitEditor = async (payload) => {
        const entry = {
          transport: payload.entry.transport,
          enabled: payload.entry.enabled,
          command: payload.entry.command,
          cwd: payload.entry.cwd,
          url: payload.entry.url,
          args: String(payload.entry.args)
            .split('\n')
            .map((row) => row.trim())
            .filter((row) => row !== ''),
          env: toRecord(payload.entry.env),
          headers: toRecord(payload.entry.headers),
        }
        const timeout = Number.parseInt(String(payload.entry.toolCallTimeoutMs ?? ''), 10)
        if (Number.isFinite(timeout) && timeout > 0) entry.toolCallTimeoutMs = timeout
        setEditorError(null)
        const outcome = await run({
          key: 'save',
          name: payload.name,
          call: () => rpc('save', { name: payload.name, entry, renameFrom: payload.renameFrom }),
          success: fill(t('notice.saved'), { name: payload.name }),
        })
        if (!outcome.ok) {
          setEditorError(errorText(t, outcome.error))
          return
        }
        setEditor(null)
      }

      const deleteServer = (server) => setConfirmTarget(server)

      const confirmDelete = async () => {
        const target = confirmTarget
        if (target === null) return
        const outcome = await run({
          key: 'remove',
          name: target.name,
          call: () => rpc('remove', { name: target.name }),
          success: fill(t('notice.deleted'), { name: target.name }),
        })
        if (!outcome.ok) {
          reportFailure(outcome.error)
          return
        }
        setConfirmTarget(null)
      }

      if (snapshot.loading && data === null) {
        return h('div', { className: 'mcpui-page' }, h('div', { className: 'mcpui-loading' }, t('loading')))
      }

      return h(
        'div',
        { className: 'mcpui-page', 'data-dsh-plugin': 'mcp-manager-ui' },
        h(
          'div',
          { className: 'mcpui-scroll' },
          h(
            'div',
            { className: 'mcpui-inner' },
            h(
              'header',
              { className: 'mcpui-head' },
              h(
                'div',
                { className: 'mcpui-headText' },
                h('h1', { className: 'mcpui-title' }, t('page.title')),
                h('p', { className: 'mcpui-subtitle' }, t('page.subtitle')),
              ),
              h(
                'div',
                { className: 'mcpui-headActions' },
                h('button', { type: 'button', className: 'mcpui-btn', onClick: () => refresh(), disabled: anyBusy }, t('action.refresh')),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'mcpui-btn',
                    'data-variant': 'primary',
                    onClick: openCreate,
                    disabled: anyBusy || capabilities.editor !== true,
                    title: capabilities.row === false ? t('error.no-row') : undefined,
                  },
                  t('action.add'),
                ),
              ),
            ),
            h(
              'div',
              { className: 'mcpui-metaRow' },
              h('span', { className: 'mcpui-dot', 'data-tone': connected > 0 ? 'ok' : 'idle', 'aria-hidden': 'true' }),
              h('span', null, fill(t('page.count'), { count: servers.length })),
              servers.length === 0 ? null : h('span', null, fill(t('page.connected'), { count: connected })),
              updatedAt === null ? null : h('span', null, fill(t('page.updatedAt'), { time: updatedAt.toLocaleTimeString() })),
              capabilities.manager === true ? null : h('span', { className: 'mcpui-error' }, t('error.no-manager')),
            ),
            snapshot.error === null ? null : h('div', { className: 'mcpui-banner', 'data-kind': 'error', role: 'alert' }, snapshot.error),
            Array.isArray(data?.problems) && data.problems.length > 0
              ? h('div', { className: 'mcpui-banner', 'data-kind': 'error' }, data.problems.join(' / '))
              : null,
            notice === null ? null : h('div', { className: 'mcpui-banner', 'data-kind': notice.kind, role: 'status', 'aria-live': 'polite' }, notice.message),
            capabilities.manager === false || capabilities.row === false
              ? h(
                  'div',
                  { className: 'mcpui-banner', 'data-kind': 'info' },
                  capabilities.manager === false ? t('error.no-manager') : t('error.no-row'),
                )
              : null,
            servers.length === 0
              ? h(
                  'div',
                  { className: 'mcpui-empty' },
                  h('h2', { className: 'mcpui-emptyTitle' }, t('empty.title')),
                  h('p', { className: 'mcpui-emptyBody' }, t('empty.body')),
                  h('p', { className: 'mcpui-emptyHint' }, t('empty.hint')),
                )
              : h(
                  'div',
                  { className: 'mcpui-list' },
                  servers.map((server) =>
                    h(ServerCard, {
                      key: server.name,
                      server,
                      t,
                      rowBusy: rowBusy(server.name) ? busy.key : null,
                      expanded: expanded === server.name,
                      onToggle: toggleServer,
                      onRestart: restartServer,
                      onProbe: probeServer,
                      onEdit: openEdit,
                      onDelete: deleteServer,
                      onExpand: (target) => setExpanded((current) => (current === target.name ? null : target.name)),
                    }),
                  ),
                ),
          ),
        ),
        confirmTarget === null
          ? null
          : h(ConfirmSheet, {
              key: 'confirm:' + confirmTarget.name,
              t,
              server: confirmTarget,
              busy: busy !== null && busy.key === 'remove',
              onCancel: () => setConfirmTarget(null),
              onConfirm: confirmDelete,
            }),
        editor === null
          ? null
          : h(EditorSheet, {
              key: 'editor:' + (editor.renameFrom || 'new'),
              t,
              draft: editor,
              busy: busy !== null && busy.key === 'save',
              hostError: editorError,
              onCancel: () => {
                setEditor(null)
                setEditorError(null)
              },
              onSubmit: submitEditor,
            }),
        probe === null ? null : h(ProbeSheet, { key: 'probe:' + probe.name + ':' + String(probe.result?.durationMs ?? ''), t, name: probe.name, result: probe.result, onClose: () => setProbe(null) }),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => {
          const element = document.createElement('style')
          element.id = 'dsh-mcp-manager-ui-styles'
          element.textContent = CSS
          document.head.appendChild(element)
          return () => element.remove()
        }, 'dsh-mcp-manager-ui: styles')
        ctx.effect(() => ctx.locale.register(NS, { zh: DICT_ZH, en: DICT_EN }), 'dsh-mcp-manager-ui: locale')
        const t = ctx.locale.bind(NS)
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: PANEL_ID,
              order: PANEL_ORDER,
              label: () => t('panel.label'),
              locale: NS,
            },
            PanelIcon,
          ),
        )
        ctx.slots.inject('main', () =>
          ctx.slots.register(
            {
              name: 'main',
              key: PANEL_ID,
              locale: NS,
              inject: () => ({ ctx }),
            },
            PanelPage,
          ),
        )
      },
    }
  },
})
