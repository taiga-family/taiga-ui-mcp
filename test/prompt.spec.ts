import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Readable, Writable} from 'node:stream';
import {describe, it} from 'node:test';
import {fileURLToPath} from 'node:url';

import {
    parseMenuChoice,
    type PromptIo,
    promptMenu,
    promptText,
} from '../src/cli/prompt.js';

const CLI = fileURLToPath(new URL('../dist/index.js', import.meta.url));

function fakeIo(line: string): {io: PromptIo; written(): string} {
    const input = Readable.from(`${line}\n`);
    const chunks: string[] = [];

    const output = new Writable({
        write(
            chunk: Buffer | string,
            _encoding: BufferEncoding,
            callback: (error?: Error | null) => void,
        ): void {
            chunks.push(chunk.toString());
            callback();
        },
    });

    return {io: {input, output}, written: () => chunks.join('')};
}

describe('parseMenuChoice', () => {
    it('maps a valid number to a 0-based index', () => {
        assert.equal(parseMenuChoice('1', 3), 0);
        assert.equal(parseMenuChoice('3', 3), 2);
    });

    it('returns the default on empty input', () => {
        assert.equal(parseMenuChoice('', 3, 0), 0);
        assert.equal(parseMenuChoice('  ', 3, 1), 1);
    });

    it('returns null for empty input without a default', () => {
        assert.equal(parseMenuChoice('', 3), null);
    });

    it('returns null for out-of-range or non-numeric input', () => {
        assert.equal(parseMenuChoice('0', 3), null);
        assert.equal(parseMenuChoice('4', 3), null);
        assert.equal(parseMenuChoice('x', 3), null);
        assert.equal(parseMenuChoice('1.5', 3), null);
    });
});

describe('promptMenu (real readline over injected streams)', () => {
    it('resolves to the selected index and renders the menu', async () => {
        const {io, written} = fakeIo('2');

        assert.equal(await promptMenu('Pick', ['a', 'b', 'c'], undefined, io), 1);
        assert.match(written(), /1\) a[\s\S]*2\) b[\s\S]*3\) c/);
    });

    it('returns the default index on empty input', async () => {
        const {io} = fakeIo('');

        assert.equal(await promptMenu('Pick', ['a', 'b'], 0, io), 0);
    });
});

describe('promptText (real readline over injected streams)', () => {
    it('reads and trims a line', async () => {
        const {io} = fakeIo('  v4  ');

        assert.equal(await promptText('Major?', io), 'v4');
    });
});

describe('non-interactive init (no TTY)', () => {
    it('exits with the missing-client error instead of prompting', () => {
        const dir = mkdtempSync(join(tmpdir(), 'tui-mcp-'));

        try {
            const result = spawnSync('node', [CLI, 'init'], {
                cwd: dir,
                encoding: 'utf8',
                timeout: 10000,
            });

            assert.equal(result.status, 1);
            assert.match(result.stderr, /Missing --client/);
        } finally {
            rmSync(dir, {recursive: true, force: true});
        }
    });
});
