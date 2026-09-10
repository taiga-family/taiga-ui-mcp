import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';

import {type TomlEntry} from './clients.js';
import {isFileNotFound} from './config-file.js';

export function buildTomlTable(tableName: string, entry: TomlEntry): string {
    const args = entry.args.map((arg) => JSON.stringify(arg)).join(', ');

    return [
        `[${tableName}]`,
        `command = ${JSON.stringify(entry.command)}`,
        `args = [${args}]`,
    ].join('\n');
}

export function upsertTomlTable(
    existing: string,
    tableName: string,
    entry: TomlEntry,
): {content: string; existed: boolean} {
    const block = buildTomlTable(tableName, entry);
    const header = `[${tableName}]`;
    const lines = existing.split('\n');
    const headerIndex = lines.findIndex((line) => line.trim() === header);

    if (headerIndex === -1) {
        const trimmed = existing.trimEnd();
        const content = trimmed ? `${trimmed}\n\n${block}\n` : `${block}\n`;

        return {content, existed: false};
    }

    let endIndex = lines.length;

    for (let index = headerIndex + 1; index < lines.length; index++) {
        if (lines[index]?.trim().startsWith('[')) {
            endIndex = index;
            break;
        }
    }

    const rebuilt = [
        ...lines.slice(0, headerIndex),
        ...block.split('\n'),
        ...lines.slice(endIndex),
    ].join('\n');

    const content = rebuilt.endsWith('\n') ? rebuilt : `${rebuilt}\n`;

    return {content, existed: true};
}

export function removeTomlTable(
    content: string,
    tableName: string,
): {content: string; removed: boolean} {
    const header = `[${tableName}]`;
    const lines = content.split('\n');
    const headerIndex = lines.findIndex((line) => line.trim() === header);

    if (headerIndex === -1) {
        return {content, removed: false};
    }

    let endIndex = lines.length;

    for (let index = headerIndex + 1; index < lines.length; index++) {
        if (lines[index]?.trim().startsWith('[')) {
            endIndex = index;
            break;
        }
    }

    const rebuilt = [...lines.slice(0, headerIndex), ...lines.slice(endIndex)].join('\n');

    const normalized =
        rebuilt === '' || rebuilt.endsWith('\n') ? rebuilt : `${rebuilt}\n`;

    return {content: normalized, removed: true};
}

export async function readTextFile(filePath: string): Promise<string> {
    try {
        return await readFile(filePath, 'utf8');
    } catch (error) {
        if (isFileNotFound(error)) {
            return '';
        }

        throw error;
    }
}

export async function writeTextFile(filePath: string, content: string): Promise<void> {
    await mkdir(dirname(filePath), {recursive: true});
    await writeFile(filePath, content, 'utf8');
}
