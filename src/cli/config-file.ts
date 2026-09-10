import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';

import {type ServerEntry} from './clients.js';

export type JsonObject = Record<string, unknown>;

export function parseConfig(raw: string): JsonObject {
    if (!raw.trim()) {
        return {};
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(raw);
    } catch (error) {
        throw new Error(
            `Existing config is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
        );
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Existing config is not a JSON object.');
    }

    return parsed as JsonObject;
}

export function mergeServerEntry(
    config: JsonObject,
    containerKey: string,
    serverName: string,
    entry: ServerEntry,
): {merged: JsonObject; existed: boolean} {
    const current = config[containerKey];

    const container =
        typeof current === 'object' && current !== null && !Array.isArray(current)
            ? (current as JsonObject)
            : {};

    const existed = serverName in container;

    const merged: JsonObject = {
        ...config,
        [containerKey]: {
            ...container,
            [serverName]: entry,
        },
    };

    return {merged, existed};
}

export function serializeConfig(config: JsonObject): string {
    return `${JSON.stringify(config, null, 2)}\n`;
}

export async function readConfigFile(filePath: string): Promise<JsonObject> {
    let raw: string;

    try {
        raw = await readFile(filePath, 'utf8');
    } catch (error) {
        if (isFileNotFound(error)) {
            return {};
        }

        throw error;
    }

    return parseConfig(raw);
}

export async function writeConfigFile(
    filePath: string,
    config: JsonObject,
): Promise<void> {
    await mkdir(dirname(filePath), {recursive: true});
    await writeFile(filePath, serializeConfig(config), 'utf8');
}

function isFileNotFound(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
    );
}
