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
        const headerMatch = /^#\s+(.+)$/.exec(lines[lineIndex]);

        if (headerMatch)
            headerIndices.push({ line: lineIndex, title: headerMatch[1].trim() });
    }

    state.sections = headerIndices.map((header, idx): DocSection => {
        const start = header.line;
        const end = headerIndices[idx + 1]?.line ?? lines.length;
        const content = lines.slice(start, end).join('\n');
        const meta = extractMeta(content);

        return {
            id: header.title,
            title: header.title,
            content,
            package: meta.package,
            kind: meta.kind,
        };
    });
}
