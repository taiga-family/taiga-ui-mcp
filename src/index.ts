#!/usr/bin/env node
import {createServer} from 'node:http';

import {toNodeHandler} from '@modelcontextprotocol/node';
import {createMcpHandler} from '@modelcontextprotocol/server';
import {serveStdio} from '@modelcontextprotocol/server/stdio';

import {ensureSourceLoaded} from './server/fetch.js';
import {buildServer} from './server/server.js';
import {logError} from './utils/logger.js';

type Transport = 'http' | 'stdio';

interface CliConfig {
    transport: Transport;
    sourceUrl?: string;
    port: number;
    host: string;
    endpoint: string;
}

function parsePort(raw: string | undefined): number {
    const port = Number(raw);

    return Number.isInteger(port) && port > 0 && port <= 65535 ? port : 8080;
}

function parseCliArgs(): CliConfig {
    const args = process.argv.slice(2);

    const config: CliConfig = {
        transport: 'stdio',
        port: parsePort(process.env.PORT),
        host: process.env.HOST || '0.0.0.0',
        endpoint: process.env.MCP_ENDPOINT || '/mcp',
    };

    const takeValue = (index: number): string | undefined => args[index];

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--transport') {
            const value = takeValue(i + 1);

            if (value === 'stdio' || value === 'http') {
                config.transport = value;
            } else {
                console.error(
                    `Error: unsupported transport "${value}". Expected "stdio" or "http".`,
                );
                process.exit(1);
            }

            i++;
        } else if (arg === '--source-url') {
            const value = takeValue(i + 1);

            if (value) {
                config.sourceUrl = value;
            }

            i++;
        } else if (arg?.startsWith('--source-url=')) {
            config.sourceUrl = arg.slice('--source-url='.length);
        } else if (arg === '--port') {
            const value = takeValue(i + 1);

            if (value) {
                config.port = parsePort(value);
            }

            i++;
        } else if (arg === '--host') {
            const value = takeValue(i + 1);

            if (value) {
                config.host = value;
            }

            i++;
        } else if (arg === '--endpoint') {
            const value = takeValue(i + 1);

            if (value) {
                config.endpoint = value.startsWith('/') ? value : `/${value}`;
            }

            i++;
        } else if (arg === '--help' || arg === '-h') {
            printHelp();
            process.exit(0);
        }
    }

    return config;
}

function printHelp(): void {
    process.stdout.write(
        `
Taiga UI MCP Server

Usage:
  taiga-ui-mcp [options]

Options:
  --transport <stdio|http>   Transport mode (default: stdio)
  --source-url <url>         Documentation source URL (or --source-url=<url>)
  --port <number>            HTTP port (default: $PORT or 8080)
  --host <host>              HTTP bind host (default: 0.0.0.0)
  --endpoint <path>          HTTP MCP endpoint path (default: /mcp)
  -h, --help                 Show this help

Environment:
  SOURCE_URL                 Documentation source URL (alternative to --source-url)
  PORT, HOST, MCP_ENDPOINT   Override HTTP defaults
`,
    );
}

async function main(): Promise<void> {
    if (process.argv[2] === 'init') {
        const {runInit} = await import('./cli/init.js');

        try {
            await runInit(process.argv.slice(3));
        } catch (error) {
            process.stderr.write(
                `init failed: ${error instanceof Error ? error.message : String(error)}\n`,
            );
            process.exit(1);
        }

        return;
    }

    if (process.argv[2] === 'remove') {
        const {runRemove} = await import('./cli/remove.js');

        try {
            await runRemove(process.argv.slice(3));
        } catch (error) {
            process.stderr.write(
                `remove failed: ${error instanceof Error ? error.message : String(error)}\n`,
            );
            process.exit(1);
        }

        return;
    }

    const config = parseCliArgs();
    const sourceUrl = config.sourceUrl ?? process.env.SOURCE_URL;

    if (!sourceUrl) {
        logError(
            'Source URL not provided',
            new Error('Set SOURCE_URL or pass --source-url=...'),
        );
        process.exit(1);
    }

    try {
        await ensureSourceLoaded();
    } catch (error) {
        logError('Initial source load failed', error);
    }

    if (config.transport === 'http') {
        // Stateless per-request handler: a fresh server instance per request,
        // no session affinity needed — required for AI Tools Hub (SEP-2575).
        const handler = createMcpHandler(() => buildServer(sourceUrl));
        const nodeHandler = toNodeHandler(handler);

        const server = createServer((req, res) => {
            const path = (req.url ?? '/').split('?')[0];

            if (path === '/health' || path === '/ready') {
                res.writeHead(200, {'Content-Type': 'text/plain'});
                res.end('ok');

                return;
            }

            if (path === config.endpoint) {
                nodeHandler(req, res).catch((error: unknown) => {
                    console.error('MCP request failed:', error);
                });

                return;
            }

            res.writeHead(404);
            res.end('Not Found');
        });

        server.listen(config.port, config.host);
        console.warn(
            `MCP server listening on http://${config.host}:${config.port}${config.endpoint}`,
        );

        const shutdown = (): void => {
            void handler
                .close()
                .then(() => {
                    server.close();
                    process.exit(0);
                })
                .catch((error: unknown) => {
                    console.error('Shutdown failed:', error);
                    process.exit(1);
                });
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    } else {
        serveStdio(() => buildServer(sourceUrl));
    }
}

main().catch((error: unknown) => {
    logError('Unhandled startup error', error);
    process.exit(1);
});
