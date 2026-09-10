import assert from 'node:assert/strict';
import {join} from 'node:path';
import {describe, it} from 'node:test';

import {type ClientConfig, findClient} from '../src/cli/clients.js';
import {displayPath, resolveConfigPath, type ScopeEnv} from '../src/cli/scope.js';

const CWD = '/work/project';
const HOME = '/home/user';

function client(id: string): ClientConfig {
    const found = findClient(id);

    assert.ok(found, `missing client ${id}`);

    return found;
}

function env(platform: NodeJS.Platform): ScopeEnv {
    return {cwd: CWD, home: HOME, platform};
}

describe('resolveConfigPath', () => {
    it('joins the project path under cwd regardless of scope target', () => {
        assert.equal(
            resolveConfigPath(client('cursor'), 'project', env('linux')),
            join(CWD, '.cursor/mcp.json'),
        );
        assert.equal(
            resolveConfigPath(client('codex'), 'project', env('darwin')),
            join(CWD, '.codex/config.toml'),
        );
    });

    it('joins a simple user path under home', () => {
        assert.equal(
            resolveConfigPath(client('claude'), 'user', env('linux')),
            join(HOME, '.claude.json'),
        );
        assert.equal(
            resolveConfigPath(client('cursor'), 'user', env('darwin')),
            join(HOME, '.cursor/mcp.json'),
        );
        assert.equal(
            resolveConfigPath(client('opencode'), 'user', env('win32')),
            join(HOME, '.config/opencode/opencode.json'),
        );
        assert.equal(
            resolveConfigPath(client('codex'), 'user', env('linux')),
            join(HOME, '.codex/config.toml'),
        );
    });

    it('picks the per-platform user path for vscode', () => {
        assert.equal(
            resolveConfigPath(client('vscode'), 'user', env('darwin')),
            join(HOME, 'Library/Application Support/Code/User/mcp.json'),
        );
        assert.equal(
            resolveConfigPath(client('vscode'), 'user', env('win32')),
            join(HOME, 'AppData/Roaming/Code/User/mcp.json'),
        );
        assert.equal(
            resolveConfigPath(client('vscode'), 'user', env('linux')),
            join(HOME, '.config/Code/User/mcp.json'),
        );
    });

    it('falls back to the linux path on unlisted platforms', () => {
        assert.equal(
            resolveConfigPath(client('vscode'), 'user', env('aix')),
            join(HOME, '.config/Code/User/mcp.json'),
        );
        assert.equal(
            resolveConfigPath(client('vscode'), 'user', env('freebsd')),
            join(HOME, '.config/Code/User/mcp.json'),
        );
    });
});

describe('displayPath', () => {
    it('shows the relative project path for project scope', () => {
        assert.equal(
            displayPath(client('cursor'), 'project', env('linux')),
            '.cursor/mcp.json',
        );
        assert.equal(
            displayPath(client('vscode'), 'project', env('darwin')),
            '.vscode/mcp.json',
        );
    });

    it('shows a ~/ prefixed path for user scope', () => {
        assert.equal(
            displayPath(client('cursor'), 'user', env('linux')),
            '~/.cursor/mcp.json',
        );
        assert.equal(
            displayPath(client('claude'), 'user', env('linux')),
            '~/.claude.json',
        );
        assert.equal(
            displayPath(client('codex'), 'user', env('linux')),
            '~/.codex/config.toml',
        );
    });

    it('shows the per-platform user path for vscode', () => {
        assert.equal(
            displayPath(client('vscode'), 'user', env('darwin')),
            '~/Library/Application Support/Code/User/mcp.json',
        );
        assert.equal(
            displayPath(client('vscode'), 'user', env('win32')),
            '~/AppData/Roaming/Code/User/mcp.json',
        );
        assert.equal(
            displayPath(client('vscode'), 'user', env('aix')),
            '~/.config/Code/User/mcp.json',
        );
    });
});
