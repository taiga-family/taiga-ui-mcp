import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {
    mergeServerEntry,
    parseConfig,
    removeServerEntry,
    serializeConfig,
} from '../src/cli/config-file.js';

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

describe('removeServerEntry', () => {
    it('removes our entry and preserves siblings and top-level keys', () => {
        const config = {
            other: true,
            mcpServers: {keep: {command: 'x', args: []}, 'taiga-ui': ENTRY},
        };

        const {config: next, removed} = removeServerEntry(
            config,
            'mcpServers',
            'taiga-ui',
        );

        assert.equal(removed, true);
        assert.deepEqual(next, {
            other: true,
            mcpServers: {keep: {command: 'x', args: []}},
        });
    });

    it('reports removed=false when the entry is absent', () => {
        const {config, removed} = removeServerEntry(
            {mcpServers: {keep: {command: 'x', args: []}}},
            'mcpServers',
            'taiga-ui',
        );

        assert.equal(removed, false);
        assert.deepEqual(config, {mcpServers: {keep: {command: 'x', args: []}}});
    });

    it('reports removed=false when the container is missing or not an object', () => {
        assert.equal(removeServerEntry({}, 'mcpServers', 'taiga-ui').removed, false);
        assert.equal(
            removeServerEntry({mcpServers: 5}, 'mcpServers', 'taiga-ui').removed,
            false,
        );
    });

    it('keeps a now-empty container intact', () => {
        const {config, removed} = removeServerEntry(
            {mcpServers: {'taiga-ui': ENTRY}},
            'mcpServers',
            'taiga-ui',
        );

        assert.equal(removed, true);
        assert.deepEqual(config, {mcpServers: {}});
    });

    it('does not mutate the input config', () => {
        const config = {mcpServers: {'taiga-ui': ENTRY, keep: {command: 'x', args: []}}};

        removeServerEntry(config, 'mcpServers', 'taiga-ui');
        assert.deepEqual(config, {
            mcpServers: {'taiga-ui': ENTRY, keep: {command: 'x', args: []}},
        });
    });
});

describe('serializeConfig', () => {
    it('pretty-prints with a trailing newline', () => {
        assert.equal(serializeConfig({a: 1}), '{\n  "a": 1\n}\n');
    });
});
