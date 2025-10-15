import { DocSection } from '../schemas/doc-types.js';
import fsSync from 'fs';
import { state } from '../server/server.js';

function validateOffsets(
    section: DocSection
): { start: number; end: number } | null {
    if (
        typeof section.startByte !== 'number' ||
        typeof section.endByte !== 'number'
    )
        return null;

    if (section.startByte < 0 || section.endByte < section.startByte)
        return null;

    return { start: section.startByte, end: section.endByte };
}

export function getSectionText(section: DocSection): string {
    if (!state.cacheFilePath) return '';

    const range = validateOffsets(section);

    if (!range) return '';

    try {
        const fd = fsSync.openSync(state.cacheFilePath, 'r');

        try {
            const length = range.end - range.start;
            const buffer = Buffer.alloc(length);

            fsSync.readSync(fd, buffer, 0, length, range.start);

            return buffer.toString('utf8');
        } finally {
            fsSync.closeSync(fd);
        }
    } catch {
        return '';
    }
}
