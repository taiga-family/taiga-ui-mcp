import { DocSection } from '../schemas/doc-types.js';
import { state } from '../server/server.js';

function extractMeta(text: string): { package?: string; kind?: string } {
    let pkg: string | undefined;
    let kind: string | undefined;

    const pkgMatch = /\*\*Package\*\*:\s*`([^`]+)`/i.exec(text);
    if (pkgMatch) pkg = pkgMatch[1];

    const typeMatch = /\*\*Type\*\*:\s*([^\n]+)/i.exec(text);
    if (typeMatch) kind = typeMatch[1].trim();

    return { package: pkg, kind };
}

export function parseContent(rawContent: string, sourceUrl: string): void {
    state.sourceUrl = sourceUrl;

    const lines = rawContent.split(/\r?\n/);
    const headerIndices: { line: number; title: string }[] = [];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const headerMatch = /^#\s+(.+)$/.exec(line);

        if (headerMatch) {
            headerIndices.push({
                line: lineIndex,
                title: headerMatch[1].trim(),
            });
        }
    }

    const lineStartBytes: number[] = new Array(lines.length + 1);

    let offset = 0;

    for (let i = 0; i < lines.length; i++) {
        lineStartBytes[i] = offset;

        // UTF-8 byte length of line + one byte for assumed '\n'
        offset += Buffer.byteLength(lines[i], 'utf8') + 1;
    }

    lineStartBytes[lines.length] = offset;

    state.sections = headerIndices.map((header, headerIndex): DocSection => {
        const start = header.line;
        const end = headerIndices[headerIndex + 1]?.line ?? lines.length;
        const startByte = lineStartBytes[start];
        const endByte = lineStartBytes[end];
        const sectionText = lines.slice(start, end).join('\n');
        const meta = extractMeta(sectionText);

        return {
            id: header.title,
            title: header.title,
            start,
            end,
            startByte,
            endByte,
            package: meta.package,
            kind: meta.kind,
        };
    });
}
