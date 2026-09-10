import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Readable, Writable} from 'node:stream';
import {describe, it} from 'node:test';
import {fileURLToPath} from 'node:url';

import {
    type PromptIo,
    promptMultiSelect,
    promptSelect,
    promptText,
} from '../src/cli/prompt.js';

const CLI = fileURLToPath(new URL('../dist/index.js', import.meta.url));
const ESC = String.fromCharCode(27);
const UP = `${ESC}[A`;
const DOWN = `${ESC}[B`;
const ENTER = '\r';
const SPACE = ' ';
const ANSI = new RegExp(String.raw`${ESC}\[[0-9;?]*[a-z]`, 'gi');

function keyIo(sequence: string): {io: PromptIo; written(): string} {
    const input = Readable.from(sequence);
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

    return {io: {input, output}, written: () => chunks.join('').replaceAll(ANSI, '')};
}

describe('promptSelect (arrow keys over injected streams)', () => {
    it('moves down and selects with enter', {timeout: 5000}, async () => {
        const {io, written} = keyIo(`${DOWN}${DOWN}${ENTER}`);

        assert.equal(await promptSelect('Pick', ['a', 'b', 'c'], 0, io), 2);

        const text = written();

        assert.ok(text.includes('a') && text.includes('b') && text.includes('c'));
    });

    it('wraps around when moving up from the first item', {timeout: 5000}, async () => {
        const {io} = keyIo(`${UP}${ENTER}`);

        assert.equal(await promptSelect('Pick', ['a', 'b', 'c'], 0, io), 2);
    });

    it('honors the initial index', {timeout: 5000}, async () => {
        const {io} = keyIo(ENTER);

        assert.equal(await promptSelect('Pick', ['a', 'b', 'c'], 1, io), 1);
    });
});

describe('promptMultiSelect (space toggles, enter confirms)', () => {
    it('returns every toggled index in order', {timeout: 5000}, async () => {
        const {io} = keyIo(`${SPACE}${DOWN}${DOWN}${SPACE}${ENTER}`);

        assert.deepEqual(await promptMultiSelect('Pick', ['a', 'b', 'c'], io), [0, 2]);
    });

    it(
        'falls back to the highlighted row when nothing is toggled',
        {timeout: 5000},
        async () => {
            const {io} = keyIo(`${DOWN}${ENTER}`);

            assert.deepEqual(await promptMultiSelect('Pick', ['a', 'b', 'c'], io), [1]);
        },
    );

    it('renders a checkbox for each row', {timeout: 5000}, async () => {
        const {io, written} = keyIo(ENTER);

        await promptMultiSelect('Pick', ['a', 'b'], io);
        assert.ok(written().includes('[ ] a'));
    });
});

describe('promptText (real readline over injected streams)', () => {
    it('reads and trims a line', {timeout: 5000}, async () => {
        const input = Readable.from('  v4  \n');

        const output = new Writable({
            write(_chunk, _encoding, callback): void {
                callback();
            },
        });

        assert.equal(await promptText('Major?', {input, output}), 'v4');
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
