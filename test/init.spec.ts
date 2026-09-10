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
    readonly servers?: Record<string, {type?: string; command: string; args: string[]}>;
}

function runInit(
    cwd: string,
    args: readonly string[],
): {status: number | null; stderr: string} {
    const result = spawnSync('node', [CLI, 'init', ...args], {cwd, encoding: 'utf8'});

    return {status: result.status, stderr: result.stderr};
}

function readConfig(path: string): McpConfig {
    return JSON.parse(readFileSync(path, 'utf8')) as McpConfig;
}

describe('init command (built CLI)', () => {
    let dir = '';

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'tui-mcp-'));
    });

    afterEach(() => {
        rmSync(dir, {recursive: true, force: true});
    });

    it('scaffolds cursor config with the default source url', () => {
        const {status} = runInit(dir, ['--client', 'cursor']);

        assert.equal(status, 0);
        assert.deepEqual(readConfig(join(dir, '.cursor/mcp.json')), {
            mcpServers: {
                'taiga-ui': {
                    command: 'npx',
                    args: [
                        '-y',
                        '@taiga-ui/mcp@latest',
                        '--source-url=https://taiga-ui.dev/llms-full.txt',
                    ],
                },
            },
        });
    });

    it('writes servers and a stdio entry for vscode', () => {
        runInit(dir, ['--client', 'vscode']);

        const config = readConfig(join(dir, '.vscode/mcp.json'));

        assert.equal(config.servers?.['taiga-ui']?.type, 'stdio');
    });

    it('preserves an existing unrelated server and honors --source-url', () => {
        mkdirSync(join(dir, '.cursor'));
        writeFileSync(
            join(dir, '.cursor/mcp.json'),
            '{"mcpServers":{"other":{"command":"x","args":[]}}}',
        );

        runInit(dir, ['--client', 'cursor', '--source-url=https://example.com/x']);

        const config = readConfig(join(dir, '.cursor/mcp.json'));
        const taiga = config.mcpServers?.['taiga-ui'];

        assert.ok(config.mcpServers?.other);
        assert.ok(taiga);
        assert.equal(
            taiga.args[taiga.args.length - 1],
            '--source-url=https://example.com/x',
        );
    });

    it('exits non-zero and lists clients for an unknown client', () => {
        const {status, stderr} = runInit(dir, ['--client', 'foo']);

        assert.equal(status, 1);
        assert.match(stderr, /Unknown client/);
        assert.match(stderr, /cursor/);
    });

    it('does not clobber an existing invalid config', () => {
        mkdirSync(join(dir, '.vscode'));
        writeFileSync(join(dir, '.vscode/mcp.json'), 'not json{');

        const {status} = runInit(dir, ['--client', 'vscode']);

        assert.notEqual(status, 0);
        assert.equal(readFileSync(join(dir, '.vscode/mcp.json'), 'utf8'), 'not json{');
    });
});
