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
        assert.equal(client.containerKey, 'servers');
        assert.equal(client.buildEntry('URL').type, 'stdio');
    });

    it('targets project-local config paths', () => {
        assert.deepEqual(
            CLIENTS.map((client) => client.configPath),
            ['.mcp.json', '.cursor/mcp.json', '.vscode/mcp.json'],
        );
    });
});
