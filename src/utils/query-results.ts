import type { DocSection, QueryResult } from '../schemas/doc-types.js';
import { findSection, suggestSections } from './find-section.js';

export function extractContentSnippets(section: DocSection): string[] {
    const text = section.content || '';
    const lines = text.split(/\r?\n/);

    const snippets: string[] = [];

    let inExampleArea = false;
    let collecting = false;
    let current: string[] = [];

    // First, try to find code blocks under ### Example
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];

        // Discover example section start
        if (!inExampleArea && /^###\s+Example/i.test(line)) {
            inExampleArea = true;
            continue;
        }

        // Fenced code block toggling (only if inExampleArea)
        if (inExampleArea && /^```/.test(line)) {
            if (!collecting) {
                collecting = true;
                current = [];

                continue;
            }

            snippets.push(current.join('\n'));
            collecting = false;

            continue;
        }

        if (collecting) {
            current.push(line);
        }
    }

    // Only extract code blocks under ### Example. If none found, return empty array
    return snippets;
}

export function buildQueryResults(names: string[]): {
    results: QueryResult[];
    matches: number;
} {
    const results: QueryResult[] = [];

    for (const queryName of names) {
        const section = findSection(queryName);

        if (!section) {
            const notFound: QueryResult = {
                query: queryName,
                suggestions: suggestSections(queryName),
            };

            results.push(notFound);

            continue;
        }

    const snippets = extractContentSnippets(section);

        const foundResult: QueryResult = {
            query: queryName,
            id: section.id,
            package: section.package || null,
            type: section.kind || null,
        };

        if (snippets.length) foundResult.content = snippets;

        results.push(foundResult);
    }

    const matches = results.filter((r) => !!r.id).length;

    return { results, matches };
}
