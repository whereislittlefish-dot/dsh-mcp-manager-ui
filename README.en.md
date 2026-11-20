English | [中文](README.md)

# dsh-mcp-manager-ui

An MCP server entry in the DSH sidebar: the icon opens a server page in the main column. The page drives the Harness-owned `@deepseek-ai/dsh-mcp-manager` — it reads live connection state and writes the manager's profile configuration — and never connects to an MCP server itself.

## Install

**Requirements**: DSH ≥ `0.2.2-rc.5` (from that release on, `dsh-web-app` mounts the `mcp-manager` row). Restart Harness once after installing so the browser loads the client module.

### From the Git repository

```text
plugin_manager install_bundle target=https://github.com/whereislittlefish-dot/dsh-mcp-manager-ui
```

You can also use “Install from GitHub” in the desktop plugin market and paste the repository URL.

### From a local package (tgz)

```text
npm pack
plugin_manager install_bundle target=<absolute path>/dsh-mcp-manager-ui-1.0.0.tgz
```

### From a local directory (development)

```text
plugin_manager install_bundle target=<absolute path>/mcp-manager-ui
```

That install is a directory link: code changes apply after re-enabling the plugin, and deleting the source directory breaks the install.

## Interface

- **Sidebar**: one “MCP servers” icon entry on the same row as Settings and the skill center. When the column collapses to its 56 px rail the icon stays, and hovering shows the name.
- **Main column**: a server list. Each row shows connection state, tool count, transport and the command or URL; the row itself carries the toggle, Edit and Details. Details holds the full configuration, state-specific advice, and Test connection / Restart / Delete.

## Operations

| Action | Behavior |
|---|---|
| New | Pick a local command (stdio) or an HTTP endpoint (streamable-http); saving writes the configuration and starts the connection |
| Edit | Change name, transport, command, arguments, working directory, environment, URL, headers and tool-call timeout; a rename warns about the tool-name change |
| Enable / Disable | Toggles only the `enabled` intent; the configuration stays |
| Restart | Rebuilds the instance and resets its reconnect budget |
| Test connection | Resolves templates, connects, lists tool names and closes, without touching the live instance; works for disabled servers too |
| Delete | Runs after a confirmation sheet that states the consequence |

## Limits

- Servers from a lower configuration layer (a bundle or the profile baseline) cannot be deleted here; the confirmation sheet only offers **Disable**.
- Servers a plugin registers at runtime are read-only; the page shows their state only.
- A removal whose closure was never confirmed shows as a **leftover record** and blocks reusing the name until Harness restarts.
- Writes land in the active profile's `cordis.patch.yml`, the same path Settings edits; a higher-priority home patch or command-line overlay makes the write fail with an error.
- Prefer `${credential:NAME}` templates for secrets. The list shows key names only, and the edit form hides values until you choose Show values.

## Example: a stdio MCP server

Create it in the page, or write it into the profile's `cordis.patch.yml`:

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

## Security

The browser reaches the Host through `POST /mcp-manager-ui/api/rpc`. Every request passes Connection's Host/Origin and browser-session checks first; the panel owns no other entry point.

## Verification

- 38 Host behaviour tests: save, validation, transport switching, rename, enable/disable, delete, inherited entries, plugin registrations, leftover records, missing manager.
- 20 browser contract tests: module id, slot registrations, 129-key zh/en dictionary parity, theme-token-only styles, icon contract.
- After installation, a same-origin probe answers 401 (Host/Origin passed, waiting for a browser session) and a foreign Origin answers 403.
