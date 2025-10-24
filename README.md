## Taiga UI MCP Server

[![MCP Badge](https://lobehub.com/badge/mcp/taiga-family-taiga-ui-mcp?style=plastic)](https://lobehub.com/mcp/taiga-family-taiga-ui-mcp)
[![npm version](https://img.shields.io/npm/v/@taiga-ui/mcp.svg)](https://npmjs.com/package/@taiga-ui/mcp)

> 🚧 **Alpha Release**  
> `@taiga-ui/mcp` is currently in **alpha**.

> **🚀 The fastest way to integrate Taiga UI components into your AI workflow**

A Model Context Protocol (MCP) server that provides AI assistants with comprehensive access to
[Taiga UI](https://taiga-ui.dev) components. Seamlessly retrieve Taiga UI components implementations for your AI-powered
development workflow.

### Key Features

- **Docs + code snippets**. Full Taiga UI markdown plus ready Angular examples in one place.
- **Two MCP tools**. Discover with `get_list_components`, fetch examples via `get_component_example`.
- **Configurable & lightweight**. Swap source URL (stable/next) without local Angular install.

### Requirements

- Node.js 18 or newer
- VS Code, Cursor, Windsurf, Claude Desktop, Goose or any other MCP client

### Getting started

First, install the Taiga UI MCP server with your client.

**Standard config** works in most of the tools:

```json5
{
  mcpServers: {
    'taiga-ui': {
      command: 'npx',
      args: [
        '@taiga-ui/mcp@latest',
        '--source-url=https://taiga-ui.dev/llms-full.txt', // or file from "/next" version, if you want
      ],
    },
  },
}
```

### Tools

<details>
<summary><b>Core automation</b></summary>

1. `get_list_components { query?: string }`
   - Lists component / section identifiers (with fuzzy substring filtering) along with basic metadata (category,
     package, type).
   - Input: optional `query` string to filter IDs (case-insensitive substring).
   - Output: strictly structured JSON containing `items`, `total`, `query`.

```json5
{
  items: [{id: 'components/Alert', name: 'Alert', category: 'components', package: 'CORE', type: 'component'}],
  total: 1,
  query: null,
}
```

2. `get_component_example { "names": ["...", "..."] }`
   - Returns full markdown content for each resolved section (entire component documentation).
   - Fuzzy name resolution: exact match, path segment, suffix, substring, and `Tui*` variants.
   - Input: `{ names: string[] }` (each name length ≥ 2).
   - Output: `results` array with objects: `query`, `id` (if resolved), `package`, `type`, `suggestions` (only when
     unresolved), `content` (array of code blocks, if examples exist). Top-level also includes `matched` (count of
     resolved names).

```json5
{
  results: [
    {
      query: 'Alert',
      id: 'components/Alert',
      package: 'CORE',
      type: 'component',
      content: ['# components/Alert\n- **Package**: ... (full section markdown here)'],
    },
  ],
  matched: 1,
}
```

> Tip: Combine `get_list_components` to discover IDs and then fetch full implementation snippets with
> `get_component_example`.

</details>

### Maintained

Taiga UI MCP is a part of [Taiga UI](https://github.com/taiga-family/taiga-ui) libraries family which is backed and used
by a large enterprise. This means you can rely on timely support and continuous development.

### Authors

<table>
    <tr> 
        <td align="center">
            <a href="https://github.com/vladimirpotekhin"
                ><img
                    src="https://github.com/vladimirpotekhin.png?size=200"
                    width="100"
                    style="margin-bottom: -4px; border-radius: 8px;"
                    alt="Vladimir Potekhin"
                /><br /><b>Vladimir&nbsp;Potekhin</b></a
            >
            <div style="margin-top: 4px">
                <a
                    href="https://twitter.com/v_potekhin"
                    title="Twitter"
                    ><img
                        width="16"
                        src="https://raw.githubusercontent.com/MarsiBarsi/readme-icons/main/twitter.svg"
                /></a>
                <a
                    href="https://github.com/vladimirpotekhin"
                    title="GitHub"
                    ><img
                        width="16"
                        src="https://raw.githubusercontent.com/MarsiBarsi/readme-icons/main/github.svg"
                /></a>
                <a
                    href="https://t.me/v_potekhin"
                    title="Telegram"
                    ><img
                        width="16"
                        src="https://raw.githubusercontent.com/MarsiBarsi/readme-icons/main/send.svg"
                /></a>
            </div>
        </td> 
        <td align="center">
            <a href="https://github.com/mdlufy"
                ><img
                    src="https://github.com/mdlufy.png?size=200"
                    width="100"
                    style="margin-bottom: -4px; border-radius: 8px;"
                    alt="German Panov"
                /><br /><b>German&nbsp;Panov</b></a
            >
            <div style="margin-top: 4px">
                <a
                    href="https://twitter.com/mdlufy_"
                    title="Twitter"
                    ><img
                        width="16"
                        src="https://raw.githubusercontent.com/MarsiBarsi/readme-icons/main/twitter.svg"
                /></a>
                <a
                    href="https://github.com/mdlufy"
                    title="GitHub"
                    ><img
                        width="16"
                        src="https://raw.githubusercontent.com/MarsiBarsi/readme-icons/main/github.svg"
                /></a>
                <a
                    href="https://t.me/mdlufy"
                    title="Telegram"
                    ><img
                        width="16"
                        src="https://raw.githubusercontent.com/MarsiBarsi/readme-icons/main/send.svg"
                /></a>
            </div>
        </td>
    </tr>
</table>
