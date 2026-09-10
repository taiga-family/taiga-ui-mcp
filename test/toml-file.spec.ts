import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {buildTomlTable, upsertTomlTable} from '../src/cli/toml-file.js';

const TABLE = 'mcp_servers.taiga-ui';

const ENTRY = {
    command: 'npx',
    args: ['-y', '@taiga-ui/mcp@latest', '--source-url=URL'],
} as const;

describe('buildTomlTable', () => {
    it('emits a header, command, and args with valid quoting', () => {
        assert.equal(
            buildTomlTable(TABLE, ENTRY),
            [
                '[mcp_servers.taiga-ui]',
                'command = "npx"',
                'args = ["-y", "@taiga-ui/mcp@latest", "--source-url=URL"]',
            ].join('\n'),
        );
    });

    it('escapes quotes inside strings via JSON string rules', () => {
        const table = buildTomlTable(TABLE, {command: 'a"b', args: ['c=d']});

        assert.match(table, /command = "a\\"b"/);
        assert.match(table, /args = \["c=d"\]/);
    });
});

describe('upsertTomlTable', () => {
    it('creates the table for missing/blank content', () => {
        const {content, existed} = upsertTomlTable('', TABLE, ENTRY);

        assert.equal(existed, false);
        assert.equal(
            content,
            [
                '[mcp_servers.taiga-ui]',
                'command = "npx"',
                'args = ["-y", "@taiga-ui/mcp@latest", "--source-url=URL"]',
                '',
            ].join('\n'),
        );
    });

    it('appends after existing content, preserving it', () => {
        const existing = '[mcp_servers.other]\ncommand = "y"\nargs = []\n';
        const {content, existed} = upsertTomlTable(existing, TABLE, ENTRY);

        assert.equal(existed, false);
        assert.equal(
            content,
            [
                '[mcp_servers.other]',
                'command = "y"',
                'args = []',
                '',
                '[mcp_servers.taiga-ui]',
                'command = "npx"',
                'args = ["-y", "@taiga-ui/mcp@latest", "--source-url=URL"]',
                '',
            ].join('\n'),
        );
    });

    it('replaces the table in place without duplicating the header', () => {
        const existing = [
            '[mcp_servers.taiga-ui]',
            'command = "npx"',
            'args = ["-y", "@taiga-ui/mcp@latest", "--source-url=OLD"]',
            '',
        ].join('\n');

        const {content, existed} = upsertTomlTable(existing, TABLE, ENTRY);

        assert.equal(existed, true);
        assert.equal(content.match(/\[mcp_servers\.taiga-ui\]/g)?.length, 1);
        assert.match(content, /--source-url=URL/);
        assert.doesNotMatch(content, /OLD/);
    });

    it('replaces in place while keeping tables that follow', () => {
        const existing = [
            '[mcp_servers.taiga-ui]',
            'command = "npx"',
            'args = ["-y", "--source-url=OLD"]',
            '',
            '[mcp_servers.other]',
            'command = "y"',
            'args = []',
            '',
        ].join('\n');

        const {content, existed} = upsertTomlTable(existing, TABLE, ENTRY);

        assert.equal(existed, true);
        assert.match(content, /\[mcp_servers\.other\]/);
        assert.match(content, /command = "y"/);
        assert.doesNotMatch(content, /OLD/);
        assert.equal(content.match(/\[mcp_servers\.taiga-ui\]/g)?.length, 1);
    });
});
