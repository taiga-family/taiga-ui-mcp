## Taiga UI MCP Server

[![MCP Badge](https://lobehub.com/badge/mcp/taiga-family-taiga-ui-mcp?style=plastic)](https://lobehub.com/mcp/taiga-family-taiga-ui-mcp)
[![npm version](https://img.shields.io/npm/v/@taiga-ui/mcp.svg)](https://npmjs.com/package/@taiga-ui/mcp)

> **🚀 The fastest way to integrate Taiga UI components into your AI workflow**

A Model Context Protocol (MCP) server that provides AI assistants with comprehensive access to
[Taiga UI](https://taiga-ui.dev) components. Seamlessly retrieve Taiga UI components implementations for your AI-powered
development workflow.

### Key Features

- **Docs + code snippets**. Full Taiga UI markdown plus ready Angular examples in one place.
- **Four MCP tools**. Get structured overview with `get_overview`, discover with `get_list_components`, fetch examples
  via `get_component_example`, and access migration guides with `get_migration_guide`.
- **Configurable & lightweight**. Swap source URL (stable/next) without local Angular install.

### Requirements

- Node.js 18 or newer
- VS Code, Cursor, Windsurf, Claude Desktop, Goose or any other MCP client

### Getting started

First, install the Taiga UI MCP server with your client.

**Standard config** works in most of the tools:

```json
{
  "mcpServers": {
    "taiga-ui": {
      "command": "npx",
      "args": [
        "@taiga-ui/mcp@latest",
        "--source-url=https://taiga-ui.dev/llms-full.txt" // or file from /next version, if you want
      ]
    }
  }
}
```

### Tools

<details>
<summary><b>Core automation</b></summary>

1. `get_overview`
   - Returns structured documentation header: import map (all packages and their exports), code generation checklist,
     CDK types reference, common mistakes, and getting started guides.
   - **Always call this first** before using other tools — it provides critical context for correct code generation
     (right packages, right types, common pitfalls).
   - Output: JSON with `sections` array (Import Map, Code Generation Checklist, CDK Types Reference, Common Mistakes,
     Getting Started) and `totalComponents` count.

```ts
get_overview();
```

```json
{
  "title": "Taiga UI - Complete Documentation",
  "sections": [
    {
      "title": "Import Map - Package Exports Reference",
      "criticalNotices": ["Always import from the correct package. This is the #1 cause of compilation errors."],
      "subsections": [...]
    },
    { "title": "Code Generation Checklist", "subsections": [...] },
    { "title": "CDK Types Reference", "subsections": [...] },
    { "title": "Common Mistakes", "subsections": [...] },
    {
      "title": "Getting Started",
      "description": "Installation and setup guides",
      "subsections": [
        { "title": "addons", "content": ["npm i @taiga-ui/addon-charts ..."] },
        { "title": "app-standalone", "content": ["import {TuiRoot} from '@taiga-ui/core'; ..."] },
        ...
      ]
    }
  ],
  "totalComponents": 185
}
```

2. `get_list_components { query?: string }`
   - Lists component / section identifiers (with fuzzy substring filtering) along with basic metadata (category,
     package, type).
   - Input: optional `query` string to filter IDs (case-insensitive substring).
   - Output: strictly structured JSON containing `items`, `total`.

```ts
get_list_components();
```

```json
{
  "items": [
    {
        "id": "components/Alert",
        "name": "Alert",
        "category": "components",
        "package": "CORE",
        "type": "component"
    },
    {
      "id": "components/Button",
      "package": "CORE",
      "type": "component",
      "name": "Button",
      "category": "components"
    },
    ...
  ],
}
```

3. `get_component_example { "names": ["...", "..."] }`
   - Returns full markdown content for each resolved section (entire component documentation).
   - Fuzzy name resolution: exact match, path segment, suffix, substring, and `Tui*` variants.
   - Input: `{ names: string[] }` (each name length ≥ 2).
   - Output: `results` array with objects: `query`, `id` (if resolved), `package`, `type`, `suggestions` (only when
     unresolved), `content` (array of code blocks, if examples exist). Top-level also includes `matched` (count of
     resolved names).

```ts
get_component_example({names: ['Alert']});
```

```json
{
  "results": [
    {
      "query": "Alert",
      "id": "components/Alert",
      "package": "CORE",
      "type": "component",
      "content": ["# components/Alert\n- **Package**: ... (full component API, usage examples, ...)"]
    }
  ],
  "matched": 1
}
```

4. `get_migration_guide`
   - Returns the complete Migration Guide for Taiga UI version updates with pre-update checklist, migration instructions via schematics, and troubleshooting for common issues.
   - Use this tool when you need to migrate between Taiga UI major versions or understand the migration process.
   - Input: none (no parameters required).
   - Output: `title`, `introduction` with version info, and `sections` array with migration guidance, code blocks for CLI commands, and solutions for common problems.

```ts
get_migration_guide();
```

```json
{
  "title": "Migration Guide",
  "introduction": [
    "**Guide to update Taiga UI v{CURRENT_MAJOR} -> v{NEXT_MAJOR}**"
  ],
  "sections": [
    {
      "title": "Before You Update",
      "content": [...]
    },
    {
      "title": "Updating",
      "content": [...],
      "codeBlocks": [...]
    },
    {
      "title": "Troubleshooting",
      "content": [...]
    }
  ]
}
```

> Tip: Start with `get_overview` to get import map and common mistakes, then use `get_list_components` to discover IDs,
> `get_component_example` to fetch full implementation snippets, and `get_migration_guide` for version upgrade guidance.

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
