# Taiga UI MCP Server

Model Context Protocol (MCP) server that exposes Taiga UI documentation as two concise tools for assistants / LLM clients.

## Provided Tools

1. get_list_components

    - Lists component / section identifiers (with fuzzy substring filtering) along with basic metadata (category, package, type).
    - Input: optional `query` string to filter IDs (case-insensitive substring).
    - Output: `{ items: [...], total, query }` strictly structured JSON.

2. get_component_example
    - Returns example code snippet blocks (fenced code) for specified section names; applies fuzzy name resolution (variants: exact, segment, suffix, substring with Tui\* variants).
    - Input: `{ names: string[] }` (each >= 2 chars).
    - Output: per name object with `found`, `id`, `package`, `type`, `suggestions` (if not found), and `examples`.

## Usage

Install dependencies and build:

```bash
npm ci
npm run build
```

Run the server directly (stdio):

```bash
./build/index.js
```

Or via the installed bin after global/local install:

```bash
npx taiga-ui-mcp
```

Then connect your MCP-compatible client (e.g., an IDE integration) pointing to the executable.

## Example Tool Invocations (Conceptual)

get_list_components { }

```
{
   "items": [
      { "id": "components/Alert", "name": "Alert", "category": "components", "package": "CORE", "type": "component" }
   ],
   "total": 1,
   "query": null
}
```

get_component_example { "names": ["Alert"] }

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
