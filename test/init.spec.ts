import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, beforeEach, describe, it} from 'node:test';
import {fileURLToPath} from 'node:url';

import {resolveSourceUrl} from '../src/cli/init.js';

const CLI = fileURLToPath(new URL('../dist/index.js', import.meta.url));

interface McpConfig {
    readonly mcpServers?: Record<string, {command: string; args: string[]}>;
    readonly servers?: Record<string, {type?: string; command: string; args: string[]}>;
}

function runInit(
    cwd: string,
    args: readonly string[],
): {status: number | null; stderr: string; stdout: string} {
    const result = spawnSync('node', [CLI, 'init', ...args], {cwd, encoding: 'utf8'});

    return {status: result.status, stderr: result.stderr, stdout: result.stdout};
}

function readConfig(path: string): McpConfig {
    return JSON.parse(readFileSync(path, 'utf8')) as McpConfig;
}

interface OpencodeConfig {
    readonly $schema?: string;
    readonly mcp?: Record<string, {type?: string; command?: string[]; enabled?: boolean}>;
}

function readOpencode(path: string): OpencodeConfig {
    return JSON.parse(readFileSync(path, 'utf8')) as OpencodeConfig;
}

function readText(path: string): string {
    return readFileSync(path, 'utf8');
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

    it('scaffolds several clients from a comma-separated --client', () => {
        const {status} = runInit(dir, ['--client', 'cursor,codex']);

        assert.equal(status, 0);
        assert.ok(readConfig(join(dir, '.cursor/mcp.json')).mcpServers?.['taiga-ui']);
        assert.match(
            readText(join(dir, '.codex/config.toml')),
            /\[mcp_servers\.taiga-ui\]/,
        );
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

        const {status, stderr} = runInit(dir, ['--client', 'vscode']);

        assert.notEqual(status, 0);
        assert.match(stderr, /init failed/);
        assert.equal(readFileSync(join(dir, '.vscode/mcp.json'), 'utf8'), 'not json{');
    });

    it('resolves --version next to the next docs url', () => {
        runInit(dir, ['--client', 'cursor', '--version', 'next']);

        const taiga = readConfig(join(dir, '.cursor/mcp.json')).mcpServers?.['taiga-ui'];

        assert.ok(taiga);
        assert.equal(
            taiga.args[taiga.args.length - 1],
            '--source-url=https://taiga-ui.dev/next/llms-full.txt',
        );
    });

    it('lets --source-url override --version', () => {
        runInit(dir, [
            '--client',
            'cursor',
            '--version',
            'next',
            '--source-url=https://example.com/x',
        ]);

        const taiga = readConfig(join(dir, '.cursor/mcp.json')).mcpServers?.['taiga-ui'];

        assert.ok(taiga);
        assert.equal(
            taiga.args[taiga.args.length - 1],
            '--source-url=https://example.com/x',
        );
    });

    it('exits non-zero for an unknown version', () => {
        const {status, stderr} = runInit(dir, [
            '--client',
            'cursor',
            '--version',
            'bogus',
        ]);

        assert.equal(status, 1);
        assert.match(stderr, /Unknown version/);
    });

    it('scaffolds opencode.json with a local array entry and $schema', () => {
        const {status} = runInit(dir, ['--client', 'opencode']);

        assert.equal(status, 0);
        assert.deepEqual(readOpencode(join(dir, 'opencode.json')), {
            $schema: 'https://opencode.ai/config.json',
            mcp: {
                'taiga-ui': {
                    type: 'local',
                    command: [
                        'npx',
                        '-y',
                        '@taiga-ui/mcp@latest',
                        '--source-url=https://taiga-ui.dev/llms-full.txt',
                    ],
                    enabled: true,
                },
            },
        });
    });

    it('preserves other opencode servers and does not overwrite an existing $schema', () => {
        writeFileSync(
            join(dir, 'opencode.json'),
            JSON.stringify({$schema: 'custom', mcp: {other: {type: 'local'}}}),
        );

        runInit(dir, ['--client', 'opencode']);

        const config = readOpencode(join(dir, 'opencode.json'));

        assert.equal(config.$schema, 'custom');
        assert.ok(config.mcp?.other);
        assert.ok(config.mcp['taiga-ui']);
    });

    it('reflects --version next in the opencode command array', () => {
        runInit(dir, ['--client', 'opencode', '--version', 'next']);

        const command = readOpencode(join(dir, 'opencode.json')).mcp?.['taiga-ui']
            ?.command;

        assert.ok(command);
        assert.equal(
            command[command.length - 1],
            '--source-url=https://taiga-ui.dev/next/llms-full.txt',
        );
    });

    it('scaffolds .codex/config.toml with the table', () => {
        const {status} = runInit(dir, ['--client', 'codex']);

        assert.equal(status, 0);
        assert.equal(
            readText(join(dir, '.codex/config.toml')),
            [
                '[mcp_servers.taiga-ui]',
                'command = "npx"',
                'args = ["-y", "@taiga-ui/mcp@latest", "--source-url=https://taiga-ui.dev/llms-full.txt"]',
                '',
            ].join('\n'),
        );
    });

    it('preserves other codex tables and never duplicates ours on re-run', () => {
        mkdirSync(join(dir, '.codex'));
        writeFileSync(
            join(dir, '.codex/config.toml'),
            '[mcp_servers.other]\ncommand = "y"\nargs = []\n',
        );

        runInit(dir, ['--client', 'codex']);
        runInit(dir, ['--client', 'codex']);

        const toml = readText(join(dir, '.codex/config.toml'));

        assert.match(toml, /\[mcp_servers\.other\]/);
        assert.equal(toml.match(/\[mcp_servers\.taiga-ui\]/g)?.length, 1);
    });

    it('prints a Codex trust note only for codex', () => {
        const codex = runInit(dir, ['--client', 'codex']);
        const cursor = runInit(dir, ['--client', 'cursor']);

        assert.match(codex.stdout, /trust this folder in Codex/);
        assert.match(codex.stdout, /~\/\.codex\/config\.toml/);
        assert.doesNotMatch(cursor.stdout, /trust/);
    });

    it('reflects --version v4 in the codex args', () => {
        runInit(dir, ['--client', 'codex', '--version', 'v4']);

        assert.match(
            readText(join(dir, '.codex/config.toml')),
            /--source-url=https:\/\/taiga-ui\.dev\/v4\/llms-full\.txt/,
        );
    });
});

describe('init command --scope (built CLI)', () => {
    let dir = '';
    let home = '';

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'tui-mcp-cwd-'));
        home = mkdtempSync(join(tmpdir(), 'tui-mcp-home-'));
    });

    afterEach(() => {
        rmSync(dir, {recursive: true, force: true});
        rmSync(home, {recursive: true, force: true});
    });

    function run(args: readonly string[]): {
        status: number | null;
        stderr: string;
        stdout: string;
    } {
        const result = spawnSync('node', [CLI, 'init', ...args], {
            cwd: dir,
            encoding: 'utf8',
            env: {...process.env, HOME: home, USERPROFILE: home},
        });

        return {status: result.status, stderr: result.stderr, stdout: result.stdout};
    }

    it('writes a user-scope cursor config under HOME and not cwd', () => {
        const {status} = run(['--client', 'cursor', '--scope', 'user']);

        assert.equal(status, 0);
        assert.ok(readConfig(join(home, '.cursor/mcp.json')).mcpServers?.['taiga-ui']);
        assert.equal(existsSync(join(dir, '.cursor/mcp.json')), false);
    });

    it('accepts the -s short flag for user scope', () => {
        const {status} = run(['--client', 'cursor', '-s', 'user']);

        assert.equal(status, 0);
        assert.ok(readConfig(join(home, '.cursor/mcp.json')).mcpServers?.['taiga-ui']);
    });

    it('writes a project-scope cursor config under cwd', () => {
        const {status} = run(['--client', 'cursor', '--scope', 'project']);

        assert.equal(status, 0);
        assert.ok(readConfig(join(dir, '.cursor/mcp.json')).mcpServers?.['taiga-ui']);
        assert.equal(existsSync(join(home, '.cursor/mcp.json')), false);
    });

    it('defaults to project scope when --scope is omitted', () => {
        const {status} = run(['--client', 'cursor']);

        assert.equal(status, 0);
        assert.ok(readConfig(join(dir, '.cursor/mcp.json')).mcpServers?.['taiga-ui']);
        assert.equal(existsSync(join(home, '.cursor/mcp.json')), false);
    });

    it('exits non-zero for an unknown scope', () => {
        const {status, stderr} = run(['--client', 'cursor', '--scope', 'bogus']);

        assert.equal(status, 1);
        assert.match(stderr, /Unknown scope/);
    });

    it('prints the codex trust note for project scope but not user scope', () => {
        const project = run(['--client', 'codex', '--scope', 'project']);
        const user = run(['--client', 'codex', '--scope', 'user']);

        assert.match(project.stdout, /trust this folder in Codex/);
        assert.doesNotMatch(user.stdout, /trust this folder in Codex/);
    });
});

describe('resolveSourceUrl', () => {
    it('maps latest to the site root', () => {
        assert.equal(resolveSourceUrl('latest'), 'https://taiga-ui.dev/llms-full.txt');
    });

    it('maps next and majors to their versioned path', () => {
        assert.equal(resolveSourceUrl('next'), 'https://taiga-ui.dev/next/llms-full.txt');
        assert.equal(resolveSourceUrl('v4'), 'https://taiga-ui.dev/v4/llms-full.txt');
        assert.equal(resolveSourceUrl('v12'), 'https://taiga-ui.dev/v12/llms-full.txt');
    });

    it('returns undefined for an unknown version', () => {
        assert.equal(resolveSourceUrl('bogus'), undefined);
        assert.equal(resolveSourceUrl('v'), undefined);
    });
});
