# Taiga UI MCP Server

> **🚀 The fastest way to integrate Taiga UI components into your AI workflow**

A Model Context Protocol (MCP) server that provides AI assistants with comprehensive access to [Taiga UI](https://taiga-ui.dev) components. Seamlessly retrieve Taiga UI components implementations for your AI-powered development workflow.

## Integrate with Your Editor

### VS Code

To configure MCP in VS Code with GitHub Copilot, add the taiga-ui server to your project's `.vscode/mcp.json` configuration file:

```json
{
    "mcpServers": {
        "taiga-ui": {
            "command": "npx",
            "args": [
                "taiga-ui-mcp@latest",
                "--source-url=https://taiga-ui.dev/llms-full.txt" // or file from "/next" version, if you want
            ]
        }
    }
}
```

## Provided Tools

1. `get_list_components { query?: string }`

    - Lists component / section identifiers (with fuzzy substring filtering) along with basic metadata (category, package, type).
    - Input: optional `query` string to filter IDs (case-insensitive substring).
    - Output: `{ items: [...], total, query }` strictly structured JSON.

```
{
   "items": [
      { "id": "components/Alert", "name": "Alert", "category": "components", "package": "CORE", "type": "component" }
   ],
   "total": 1,
   "query": null
}
```

2. `get_component_example { "names": ["...", "..."] }`

    - Returns example code snippet blocks (fenced code) for specified section names; applies fuzzy name resolution (variants: exact, segment, suffix, substring with Tui\* variants).
    - Input: `{ names: string[] }` (each >= 2 chars).
    - Output: per name object with `found`, `id`, `package`, `type`, `suggestions` (if not found), and `examples`.

```
{
   "results": [
      {
         "query": "Alert",
         "found": true,
         "id": "components/Alert",
         "package": "CORE",
         "type": "component",
         "examples": ["<tui-alert appearance=\"...\">...</tui-alert>"]
      }
   ],
   "totalQueries": 1,
   "matches": 1
}
```

## Authors

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
