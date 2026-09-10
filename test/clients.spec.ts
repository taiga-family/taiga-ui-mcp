import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {CLIENTS, findClient} from '../src/cli/clients.js';

describe('client registry', () => {
    it('resolves known clients and rejects unknown ones', () => {
        assert.equal(findClient('cursor')?.id, 'cursor');
        assert.equal(findClient('nope'), undefined);
    });

    it('uses mcpServers and a plain entry for claude and cursor', () => {
        for (const id of ['claude', 'cursor']) {
            const client = findClient(id);

            assert.ok(client);
            assert.ok(client.kind === 'json');
            assert.equal(client.containerKey, 'mcpServers');

            const entry = client.buildEntry('URL');

            assert.equal(entry.type, undefined);
            assert.deepEqual(entry.args, [
                '-y',
                '@taiga-ui/mcp@latest',
                '--source-url=URL',
            ]);
        }
    });

    it('uses servers and a stdio entry for vscode', () => {
        const client = findClient('vscode');

        assert.ok(client);
        assert.ok(client.kind === 'json');
        assert.equal(client.containerKey, 'servers');
        assert.equal(client.buildEntry('URL').type, 'stdio');
    });

    it('uses mcp, a local array entry, and a $schema default for opencode', () => {
        const client = findClient('opencode');

        assert.ok(client);
        assert.ok(client.kind === 'json');
        assert.equal(client.containerKey, 'mcp');
        assert.deepEqual(client.rootDefaults, {
            $schema: 'https://opencode.ai/config.json',
        });

        const entry = client.buildEntry('URL');

        assert.equal(entry.type, 'local');
        assert.equal(entry.enabled, true);
        assert.deepEqual(entry.command, [
            'npx',
            '-y',
            '@taiga-ui/mcp@latest',
            '--source-url=URL',
        ]);
    });

    it('uses a toml table and a command/args entry for codex', () => {
        const client = findClient('codex');

        assert.ok(client);
        assert.ok(client.kind === 'toml');
        assert.equal(client.tableName, 'mcp_servers.taiga-ui');

        const entry = client.buildEntry('URL');

        assert.equal(entry.command, 'npx');
        assert.deepEqual(entry.args, ['-y', '@taiga-ui/mcp@latest', '--source-url=URL']);
    });

    it('targets project-local config paths', () => {
        assert.deepEqual(
            CLIENTS.map((client) => client.configPath),
            [
                '.mcp.json',
                '.cursor/mcp.json',
                '.vscode/mcp.json',
                'opencode.json',
                '.codex/config.toml',
            ],
        );
    });
});
