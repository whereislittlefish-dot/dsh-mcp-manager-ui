/**
 * `dsh-mcp-manager-ui` — Host half.
 *
 * The panel is a management surface for the MCP server fleet that
 * `@deepseek-ai/dsh-mcp-manager` already owns. It never mounts MCP instances
 * itself: reads go through `ctx.mcpManager.list()` plus the profile layers the
 * ConfigEditor knows, and every write goes through `ctx.configEditor.edit()`
 * on the manager's own profile row, so the manager reconciles the live fleet
 * exactly as it does for a Settings edit.
 *
 * The browser reaches this file through one fenced HTTP route
 * (`POST /mcp-manager-ui/api/rpc`) and never sees a secret it did not type:
 * the list view carries no `env`/`headers` values, only their key names.
 *
 * @module dsh-mcp-manager-ui
 */

/** Loader row name of the manager this panel drives. */
const MANAGER_MODULE = '@deepseek-ai/dsh-mcp-manager'

/** The single route this plugin owns. */
const ROUTE_PATH = '/mcp-manager-ui/api'

/** Body cap for one RPC call; a server entry is small, a pasted config is not huge. */
const MAX_BODY_BYTES = 512 * 1024

/** The manager's own key rule, restated so the panel refuses before a write. */
const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/

/** Transport ids accepted by the manager schema. */
const TRANSPORTS = new Set(['stdio', 'streamable-http'])

/** Milliseconds a snapshot of the profile layers stays warm between polls. */
const LAYER_CACHE_MS = 2000

/**
 * One panel-facing failure: a stable code the browser can branch on plus a
 * message written for the user.
 */
class PanelError extends Error {
  /**
   * @param code - stable machine code, e.g. `invalid-transport`.
   * @param message - user-facing explanation.
   */
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

/**
 * Reject a value the panel cannot explain.
 * @param code - machine code.
 * @param message - user-facing text.
 * @returns never.
 */
function fail(code, message) {
  throw new PanelError(code, message)
}

/**
 * Coerce a textarea value into a string list.
 * @param value - array from a round-trip, string, or undefined.
 * @returns trimmed, non-empty lines.
 */
function toStringList(value) {
  const rows = Array.isArray(value) ? value : typeof value === 'string' ? value.split('\n') : []
  return rows.map((row) => String(row).trim()).filter((row) => row !== '')
}

/**
 * Coerce a key/value textarea value into a record.
 * @param value - object from a round-trip, `KEY=VALUE` lines, or undefined.
 * @returns entries with a non-empty key.
 */
function toRecord(value) {
  if (value === undefined || value === null) return {}
  if (typeof value === 'string') {
    const out = {}
    for (const line of value.split('\n')) {
      const row = line.trim()
      if (row === '') continue
      const index = row.indexOf('=')
      if (index < 0) out[row] = ''
      else out[row.slice(0, index).trim()] = row.slice(index + 1).trim()
    }
    return out
  }
  if (typeof value !== 'object') return {}
  const out = {}
  for (const [key, raw] of Object.entries(value)) {
    const name = String(key).trim()
    if (name === '') continue
    out[name] = String(raw ?? '')
  }
  return out
}

/**
 * Build the complete entry written for one server.
 *
 * Every field is written even when empty: the profile layer deep-merges object
 * values, so omitting `command` on a transport switch would leave the previous
 * transport's value behind and the manager would refuse the write as a
 * cross-transport field.
 *
 * @param input - panel payload.
 * @returns a complete manager entry.
 */
function normalizeEntry(input) {
  const source = input !== null && typeof input === 'object' ? input : {}
  const transport = source.transport
  if (!TRANSPORTS.has(transport)) fail('invalid-transport', '传输类型必须是 stdio 或 streamable-http')
  const entry = {
    transport,
    enabled: source.enabled !== false,
    command: '',
    args: [],
    env: {},
    cwd: '',
    url: '',
    headers: {},
  }
  if (transport === 'stdio') {
    const command = typeof source.command === 'string' ? source.command.trim() : ''
    if (command === '') fail('missing-command', 'stdio 传输需要可执行命令（command）')
    entry.command = command
    entry.args = toStringList(source.args)
    entry.env = toRecord(source.env)
    entry.cwd = typeof source.cwd === 'string' ? source.cwd.trim() : ''
  } else {
    const url = typeof source.url === 'string' ? source.url.trim() : ''
    if (url === '') fail('missing-url', 'streamable-http 传输需要服务器地址（url）')
    let parsed
    try {
      parsed = new URL(url)
    } catch {
      fail('invalid-url', '服务器地址必须是完整 URL，例如 https://example.com/mcp')
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') fail('invalid-url', '服务器地址只支持 http 或 https')
    entry.url = url
    entry.headers = toRecord(source.headers)
  }
  if (Number.isFinite(source.toolCallTimeoutMs) && source.toolCallTimeoutMs > 0) {
    entry.toolCallTimeoutMs = Math.round(source.toolCallTimeoutMs)
  }
  if (Number.isFinite(source.startupTimeoutMs) && source.startupTimeoutMs > 0) {
    entry.startupTimeoutMs = Math.round(source.startupTimeoutMs)
  }
  return entry
}

/**
 * Deep-merge one server entry over its inherited base, the way the manager's
 * volatile configuration layers do.
 * @param base - inherited entry from a lower profile layer.
 * @param over - user-layer entry.
 * @returns the effective entry, or undefined when both are absent.
 */
function mergeEntry(base, over) {
  if (base === undefined && over === undefined) return undefined
  return { ...(base ?? {}), ...(over ?? {}) }
}

/**
 * JSON clone for values crossing the HTTP boundary.
 * @param value - any JSON value.
 * @returns a detached copy.
 */
function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

/** Services this row cannot work without: the HTTP route owner. */
export const inject = ['webServer']

/** Cordis plugin name used by Loader diagnostics. */
export const name = 'mcp-manager-ui'

/**
 * Host body: one route, one fence, one dispatch table.
 * @param ctx - the plugin context.
 * @param config - row configuration (unused; reserved for future limits).
 */
export function apply(ctx, config) {
  void config
  const layers = { at: 0, value: null }

  /**
   * The manager's ConfigEditor entry, or undefined when this profile has no
   * such row (or no editor at all).
   * @returns the Loader entry driving the manager.
   */
  function managerEntry() {
    const editor = ctx.get('configEditor')
    if (editor === undefined || typeof editor.entries !== 'function') return { editor: undefined, entry: undefined }
    const entry = editor.entries().find((row) => row.options.name === MANAGER_MODULE)
    return { editor, entry }
  }

  /**
   * Read the profile layers for the manager row: the user patch (`current`)
   * and everything beneath it (`inherited`).
   * @returns the two `servers` maps plus whether a manager row exists.
   */
  function readLayers() {
    const now = Date.now()
    if (layers.value !== null && now - layers.at < LAYER_CACHE_MS) return layers.value
    const { editor, entry } = managerEntry()
    const value = { editor, entry, current: {}, inherited: {}, hasRow: entry !== undefined }
    if (entry !== undefined) {
      try {
        const row = editor.configuration().find((candidate) => candidate.entry === entry)
        value.current = clone(row?.override ?? {}) ?? {}
        value.inherited = clone(row?.inherited ?? {}) ?? {}
        if (typeof row?.override?.servers !== 'object') value.current.servers = {}
        if (typeof row?.inherited?.servers !== 'object') value.inherited.servers = {}
      } catch (error) {
        value.error = error instanceof Error ? error.message : String(error)
        value.current = {}
        value.inherited = {}
      }
    } else {
      const settings = ctx.get('settings')
      if (settings !== undefined && typeof settings.describe === 'function') {
        try {
          const row = settings.describe().find((candidate) => candidate.ns === entryId())
          const servers = row?.value?.servers
          if (servers !== null && typeof servers === 'object') value.inherited = { servers: clone(servers) }
        } catch {
          /* a missing settings face is not fatal: the list still comes from the manager */
        }
      }
    }
    layers.at = now
    layers.value = value
    return value
  }

  /**
   * The profile row id the manager is configured under.
   * @returns the row id, or `mcp-manager` when the row cannot be found.
   */
  function entryId() {
    const { entry } = managerEntry()
    return entry?.options?.id ?? 'mcp-manager'
  }

  /**
   * Drop the cached layers after a write so the next read sees the new patch.
   */
  function invalidate() {
    layers.at = 0
    layers.value = null
  }

  /**
   * Compose the panel's server list: runtime status from the manager, entry
   * fields from the profile layers, and where each server comes from.
   * @returns the snapshot the browser renders.
   */
  function snapshot() {
    const manager = ctx.get('mcpManager')
    const layer = readLayers()
    const currentServers = layer.current?.servers ?? {}
    const inheritedServers = layer.inherited?.servers ?? {}
    const runtime = typeof manager?.list === 'function' ? manager.list() : []
    const names = new Set([...Object.keys(currentServers), ...Object.keys(inheritedServers)])
    for (const view of runtime) if (view?.name !== undefined) names.add(view.name)
    const statuses = new Map(runtime.map((view) => [view.name, view]))
    const servers = [...names].map((name) => {
      const over = currentServers[name]
      const base = inheritedServers[name]
      const effective = mergeEntry(base, over) ?? {}
      const view = statuses.get(name)
      const configured = view?.configured
      const source = over !== undefined ? 'profile' : base !== undefined ? 'inherited' : configured === false ? 'removed' : 'registered'
      const transport = effective.transport === 'streamable-http' ? 'streamable-http' : 'stdio'
      return {
        name,
        source,
        configured: view?.configured ?? source !== 'registered',
        enabled: effective.enabled !== false,
        transport,
        command: transport === 'stdio' ? (effective.command ?? '') : '',
        args: transport === 'stdio' ? (Array.isArray(effective.args) ? effective.args : []) : [],
        cwd: transport === 'stdio' ? (effective.cwd ?? '') : '',
        url: transport === 'streamable-http' ? (effective.url ?? '') : '',
        envKeys: transport === 'stdio' ? Object.keys(effective.env ?? {}) : [],
        headerKeys: transport === 'streamable-http' ? Object.keys(effective.headers ?? {}) : [],
        toolCallTimeoutMs: effective.toolCallTimeoutMs,
        startupTimeoutMs: effective.startupTimeoutMs,
        status: view?.status ?? (effective.enabled === false ? { state: 'disabled' } : { state: 'connecting', attempt: 0 }),
      }
    })
    return {
      servers,
      rowId: entryId(),
      capabilities: {
        manager: manager !== undefined,
        editor: layer.editor !== undefined,
        row: layer.hasRow,
      },
      problems: layer.error === undefined ? [] : [layer.error],
    }
  }

  /**
   * One server's full entry values, for the edit form only.
   * @param name - server key.
   * @returns the effective entry and its source.
   */
  function detail(name) {
    const layer = readLayers()
    const effective = mergeEntry(layer.inherited?.servers?.[name], layer.current?.servers?.[name])
    if (effective === undefined) fail('unknown-server', `没有找到 MCP 服务器「${name}」`)
    return { name, source: layer.current?.servers?.[name] !== undefined ? 'profile' : 'inherited', entry: clone(effective) }
  }

  /**
   * Write one mutation against the manager row's user layer.
   *
   * The callback receives a shallow copy of the user-layer `servers` map and
   * returns the map to store; inherited entries come back automatically
   * because Loader deep-merges this layer over the base one.
   *
   * @param mutate - receives the user-layer servers, returns the next map.
   * @returns the row id the change landed on.
   */
  async function writeServers(mutate) {
    const { editor, entry } = managerEntry()
    if (editor === undefined) fail('no-editor', '当前 profile 没有配置编辑器（configEditor），无法保存 MCP 服务器')
    if (entry === undefined) fail('no-row', `当前 profile 没有 ${MANAGER_MODULE} 行，无法保存 MCP 服务器`)
    await editor.edit(entry, (current) => {
      const servers = { ...(current?.servers ?? {}) }
      const next = mutate(servers)
      return { ...current, servers: next ?? servers }
    })
    invalidate()
    return entry.options.id
  }

  /**
   * The manager service, or a clear failure.
   * @returns the live manager.
   */
  function managerOrFail() {
    const manager = ctx.get('mcpManager')
    if (manager === undefined) fail('no-manager', '当前 profile 没有挂载 @deepseek-ai/dsh-mcp-manager，无法操作 MCP 服务器')
    return manager
  }

  /**
   * Whether a name belongs to a server some plugin registered for its own
   * lifetime. Those entries are owned by that plugin: writing a configured
   * entry under the same name would collide with its `serverName` reservation.
   * @param name - server key.
   * @returns true when the manager reports a live registration not present in
   * either configuration layer.
   */
  function isRegistered(name) {
    const layer = readLayers()
    if (layer.current?.servers?.[name] !== undefined || layer.inherited?.servers?.[name] !== undefined) return false
    const manager = ctx.get('mcpManager')
    if (manager === undefined || typeof manager.list !== 'function') return false
    const view = manager.list().find((row) => row.name === name)
    return view !== undefined && view.configured === true
  }

  /**
   * Whether a name is a retained record whose cleanup never finished: no
   * configuration layer owns it and the manager no longer reports it as
   * configured, which only happens after a failed removal.
   * @param name - server key.
   * @returns true for a leftover runtime record.
   */
  function isRemoved(name) {
    const layer = readLayers()
    if (layer.current?.servers?.[name] !== undefined || layer.inherited?.servers?.[name] !== undefined) return false
    const manager = ctx.get('mcpManager')
    if (manager === undefined || typeof manager.list !== 'function') return false
    const view = manager.list().find((row) => row.name === name)
    return view !== undefined && view.configured === false
  }

  /**
   * Refuse to write a name the panel does not own: a plugin-owned registration
   * or a leftover record awaiting restart.
   * @param name - server key.
   */
  function refuseUnmanaged(name) {
    if (isRegistered(name)) {
      fail('registered-readonly', `「${name}」由插件在运行期注册，面板不能修改或删除它；请在该插件的配置里调整`)
    }
    if (isRemoved(name)) {
      fail('removed-readonly', `「${name}」是上次删除后清理未完成的残留记录，重启 Harness 后才会消失`)
    }
  }

  /**
   * Settle a write before answering: the manager reconciles asynchronously, so
   * a short pause keeps the returned snapshot close to the new truth.
   */
  function settle() {
    return new Promise((resolve) => setTimeout(resolve, 150))
  }

  const methods = {
    /**
     * Current fleet and configuration for the panel.
     * @returns the snapshot.
     */
    status() {
      return snapshot()
    },

    /**
     * One server's stored values for the edit form.
     * @param args - `{ name }`.
     * @returns the effective entry.
     */
    detail(args) {
      return detail(String(args?.name ?? ''))
    },

    /**
     * Create or update one server. Renaming moves the entry in one write.
     * @param args - `{ name, entry, renameFrom? }`.
     * @returns the new snapshot.
     */
    async save(args) {
      const name = String(args?.name ?? '').trim()
      if (!SERVER_NAME_PATTERN.test(name)) {
        fail('invalid-name', '服务器名称只能包含字母、数字、下划线和短横线，长度 1–32')
      }
      const entry = normalizeEntry(args?.entry)
      const renameFrom = typeof args?.renameFrom === 'string' ? args.renameFrom.trim() : ''
      refuseUnmanaged(name)
      if (renameFrom !== '' && renameFrom !== name) refuseUnmanaged(renameFrom)
      const rowId = await writeServers((servers) => {
        if (renameFrom !== '' && renameFrom !== name) {
          if (Object.hasOwn(servers, name)) fail('name-taken', `已经有一个服务器叫「${name}」`)
          delete servers[renameFrom]
        }
        servers[name] = entry
        return servers
      })
      await settle()
      return { ...snapshot(), rowId }
    },

    /**
     * Toggle the durable `enabled` intent without touching the endpoint.
     * @param args - `{ name, enabled }`.
     * @returns the new snapshot.
     */
    async toggle(args) {
      const name = String(args?.name ?? '').trim()
      const enabled = args?.enabled !== false
      refuseUnmanaged(name)
      await writeServers((servers) => {
        const layer = readLayers()
        const effective = mergeEntry(layer.inherited?.servers?.[name], servers[name])
        if (effective === undefined) fail('unknown-server', `没有找到 MCP 服务器「${name}」`)
        servers[name] = { ...effective, enabled }
        return servers
      })
      await settle()
      return snapshot()
    },

    /**
     * Remove a user-layer entry. An entry inherited from a lower layer cannot
     * be deleted from here — the base layer would restore it — so it is
     * disabled instead and the caller is told.
     * @param args - `{ name }`.
     * @returns the new snapshot plus an optional notice.
     */
    async remove(args) {
      const name = String(args?.name ?? '').trim()
      refuseUnmanaged(name)
      const layer = readLayers()
      if (layer.current?.servers?.[name] === undefined) {
        if (layer.inherited?.servers?.[name] !== undefined) {
          await writeServers((servers) => {
            servers[name] = { ...mergeEntry(layer.inherited?.servers?.[name], servers[name]), enabled: false }
            return servers
          })
          await settle()
          return {
            ...snapshot(),
            notice: { kind: 'info', code: 'inherited-disabled', name, message: `「${name}」来自下层配置（bundle 或 profile 基线），面板无法删除，已改为停用` },
          }
        }
        fail('unknown-server', `没有找到 MCP 服务器「${name}」`)
      }
      await writeServers((servers) => {
        delete servers[name]
        return servers
      })
      await settle()
      return snapshot()
    },

    /**
     * Replace one live instance, resetting its reconnect budget.
     * @param args - `{ name }`.
     * @returns the new snapshot.
     */
    async restart(args) {
      const name = String(args?.name ?? '').trim()
      await managerOrFail().restart(name)
      await settle()
      return snapshot()
    },

    /**
     * Probe a server without touching its live instance.
     * @param args - `{ name }`.
     * @returns the probe result plus the new snapshot.
     */
    async probe(args) {
      const name = String(args?.name ?? '').trim()
      const manager = managerOrFail()
      const result = await manager.probe(name, { timeoutMs: 15000 })
      await settle()
      return { result, ...snapshot() }
    },
  }

  /**
   * Read a JSON request body.
   * @param req - the incoming request.
   * @returns the decoded body text.
   */
  function readBody(req) {
    return new Promise((resolve, reject) => {
      let size = 0
      const chunks = []
      req.on('data', (chunk) => {
        size += chunk.length
        if (size > MAX_BODY_BYTES) {
          reject(new PanelError('body-too-large', '请求体超过上限'))
          req.destroy()
          return
        }
        chunks.push(chunk)
      })
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      req.on('error', (error) => reject(error))
    })
  }

  /**
   * Write one JSON response.
   * @param res - the response.
   * @param status - HTTP status.
   * @param payload - JSON-serializable body.
   */
  function send(res, status, payload) {
    const body = JSON.stringify(payload)
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'content-length': Buffer.byteLength(body),
    })
    res.end(body)
  }

  /**
   * Result of the shared browser fence for one request: `0` when the request
   * may speak for this browser surface, otherwise the HTTP status the fence
   * chose (403 for a foreign Host/Origin, 401 for a missing browser session).
   * @param req - the incoming request.
   * @returns 0 or a rejection status.
   */
  function rejectionOf(req) {
    const connection = ctx.get('connection')
    if (connection === undefined || typeof connection.requestRejection !== 'function') return 403
    return connection.requestRejection(req) ?? 0
  }

  /**
   * One RPC call.
   * @param req - the incoming request.
   * @param res - the response.
   */
  async function handle(req, res) {
    const rejection = rejectionOf(req)
    if (rejection !== 0) {
      send(res, rejection, {
        ok: false,
        error: {
          code: rejection === 401 ? 'unauthenticated' : 'forbidden',
          message: rejection === 401 ? '浏览器会话未通过身份校验，请刷新 Harness 页面' : '请求来源未通过浏览器信任校验',
        },
      })
      return
    }
    if (req.method !== 'POST') {
      send(res, 405, { ok: false, error: { code: 'method-not-allowed', message: '只接受 POST' } })
      return
    }
    let payload
    try {
      payload = JSON.parse(await readBody(req) || '{}')
    } catch (error) {
      send(res, 400, { ok: false, error: { code: 'invalid-body', message: error instanceof Error ? error.message : String(error) } })
      return
    }
    const method = payload?.method
    const operation = Object.hasOwn(methods, method) ? methods[method] : undefined
    if (operation === undefined) {
      send(res, 400, { ok: false, error: { code: 'unknown-method', message: `未知操作：${String(method)}` } })
      return
    }
    try {
      const value = await operation(payload?.args ?? {})
      send(res, 200, { ok: true, value })
    } catch (error) {
      const code = error instanceof PanelError ? error.code : 'operation-failed'
      const message = error instanceof Error ? error.message : String(error)
      send(res, 200, { ok: false, error: { code, message } })
    }
  }

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'prefix',
        path: ROUTE_PATH,
        handler: (req, res) => {
          handle(req, res).catch((error) => {
            try {
              send(res, 500, { ok: false, error: { code: 'internal', message: error instanceof Error ? error.message : String(error) } })
            } catch {
              /* the response is already gone */
            }
          })
        },
      }),
    'dsh-mcp-manager-ui: /mcp-manager-ui/api route',
  )
}
