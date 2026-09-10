import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, beforeEach, describe, it} from 'node:test';
import {fileURLToPath} from 'node:url';

const CLI = fileURLToPath(new URL('../dist/index.js', import.meta.url));

interface McpConfig {
    readonly mcpServers?: Record<string, {command: string; args: string[]}>;
}

interface Run {
    readonly status: number | null;
    readonly stderr: string;
    readonly stdout: string;
}

function run(cwd: string, command: string, args: readonly string[], home?: string): Run {
    const env = home ? {...process.env, HOME: home, USERPROFILE: home} : process.env;

    const result = spawnSync('node', [CLI, command, ...args], {
        cwd,
        encoding: 'utf8',
        env,
    });

    return {status: result.status, stderr: result.stderr, stdout: result.stdout};
}

function readConfig(path: string): McpConfig {
    return JSON.parse(readFileSync(path, 'utf8')) as McpConfig;
}

function readText(path: string): string {
    return readFileSync(path, 'utf8');
}

describe('remove command (built CLI)', () => {
    let dir = '';

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'tui-mcp-rm-'));
    });

    afterEach(() => {
        rmSync(dir, {recursive: true, force: true});
    });

    it('round-trips a JSON client, stripping ours and keeping others (cursor)', () => {
        mkdirSync(join(dir, '.cursor'));
        writeFileSync(
            join(dir, '.cursor/mcp.json'),
            '{"mcpServers":{"other":{"command":"x","args":[]}}}',
        );

        run(dir, 'init', ['--client', 'cursor']);
        const removed = run(dir, 'remove', ['--client', 'cursor']);

        assert.equal(removed.status, 0);
        assert.match(removed.stdout, /Removed "taiga-ui" from \.cursor\/mcp\.json/);

        const config = readConfig(join(dir, '.cursor/mcp.json'));

        assert.ok(config.mcpServers?.other);
        assert.equal(config.mcpServers['taiga-ui'], undefined);
    });

    it('round-trips the TOML client, stripping ours and keeping others (codex)', () => {
        mkdirSync(join(dir, '.codex'));
        writeFileSync(
            join(dir, '.codex/config.toml'),
            '[mcp_servers.other]\ncommand = "y"\nargs = []\n',
        );

        run(dir, 'init', ['--client', 'codex']);
        const removed = run(dir, 'remove', ['--client', 'codex']);

        assert.equal(removed.status, 0);
        assert.match(removed.stdout, /Removed "taiga-ui"/);

        const toml = readText(join(dir, '.codex/config.toml'));

        assert.match(toml, /\[mcp_servers\.other\]/);
        assert.doesNotMatch(toml, /\[mcp_servers\.taiga-ui\]/);
    });

    it('is a graceful no-op when our entry is absent', () => {
        const removed = run(dir, 'remove', ['--client', 'cursor']);

        assert.equal(removed.status, 0);
        assert.match(removed.stdout, /No "taiga-ui" server in \.cursor\/mcp\.json/);
    });

    it('exits non-zero and lists clients for an unknown client', () => {
        const {status, stderr} = run(dir, 'remove', ['--client', 'foo']);

        assert.equal(status, 1);
        assert.match(stderr, /Unknown client/);
    });
});

describe('remove command --scope (built CLI)', () => {
    let dir = '';
    let home = '';

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'tui-mcp-rm-cwd-'));
        home = mkdtempSync(join(tmpdir(), 'tui-mcp-rm-home-'));
    });

    afterEach(() => {
        rmSync(dir, {recursive: true, force: true});
        rmSync(home, {recursive: true, force: true});
    });

    it('removes a user-scope entry under HOME', () => {
        run(dir, 'init', ['--client', 'cursor', '--scope', 'user'], home);
        const removed = run(
            dir,
            'remove',
            ['--client', 'cursor', '--scope', 'user'],
            home,
        );

        assert.equal(removed.status, 0);
        assert.match(removed.stdout, /Removed "taiga-ui" from ~\/\.cursor\/mcp\.json/);
        assert.equal(
            readConfig(join(home, '.cursor/mcp.json')).mcpServers?.['taiga-ui'],
            undefined,
        );
    });

    it('removes windsurf from the global config even for project scope', () => {
        run(dir, 'init', ['--client', 'windsurf'], home);
        const removed = run(dir, 'remove', ['--client', 'windsurf'], home);

        assert.equal(removed.status, 0);
        assert.match(removed.stdout, /Removed "taiga-ui"/);
        assert.equal(
            readConfig(join(home, '.codeium/windsurf/mcp_config.json')).mcpServers?.[
                'taiga-ui'
            ],
            undefined,
        );
    });
});
