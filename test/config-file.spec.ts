import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {mergeServerEntry, parseConfig, serializeConfig} from '../src/cli/config-file.js';

const ENTRY = {command: 'npx', args: ['-y']} as const;

describe('parseConfig', () => {
    it('treats blank input as an empty object', () => {
        assert.deepEqual(parseConfig(''), {});
        assert.deepEqual(parseConfig('   \n'), {});
    });

    it('parses a JSON object', () => {
        assert.deepEqual(parseConfig('{"a":1}'), {a: 1});
    });

    it('throws on invalid JSON', () => {
        assert.throws(() => parseConfig('not json{'), /not valid JSON/);
    });

    it('throws on non-object JSON', () => {
        assert.throws(() => parseConfig('[]'), /not a JSON object/);
        assert.throws(() => parseConfig('42'), /not a JSON object/);
    });
});

describe('mergeServerEntry', () => {
    it('adds the server under a fresh container', () => {
        const {merged, existed} = mergeServerEntry({}, 'mcpServers', 'taiga-ui', ENTRY);

        assert.equal(existed, false);
        assert.deepEqual(merged, {mcpServers: {'taiga-ui': ENTRY}});
    });

    it('preserves other servers and top-level keys', () => {
        const config = {other: true, mcpServers: {keep: {command: 'x', args: []}}};
        const {merged} = mergeServerEntry(config, 'mcpServers', 'taiga-ui', ENTRY);

        assert.deepEqual(merged, {
            other: true,
            mcpServers: {keep: {command: 'x', args: []}, 'taiga-ui': ENTRY},
        });
    });

    it('reports existed=true when overwriting an entry', () => {
        const config = {mcpServers: {'taiga-ui': {command: 'old', args: []}}};
        const {existed} = mergeServerEntry(config, 'mcpServers', 'taiga-ui', ENTRY);

        assert.equal(existed, true);
    });

    it('does not mutate the input config', () => {
        const config = {mcpServers: {keep: {command: 'x', args: []}}};

        mergeServerEntry(config, 'mcpServers', 'taiga-ui', ENTRY);
        assert.deepEqual(config, {mcpServers: {keep: {command: 'x', args: []}}});
    });

    it('replaces a non-object container instead of crashing', () => {
        const {merged} = mergeServerEntry(
            {mcpServers: 5},
            'mcpServers',
            'taiga-ui',
            ENTRY,
        );

        assert.deepEqual(merged, {mcpServers: {'taiga-ui': ENTRY}});
    });
});

describe('serializeConfig', () => {
    it('pretty-prints with a trailing newline', () => {
        assert.equal(serializeConfig({a: 1}), '{\n  "a": 1\n}\n');
    });
});
