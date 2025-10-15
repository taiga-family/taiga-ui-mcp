import type { DocSection, QueryResult } from '../schemas/doc-types.js';
import { findSection, suggestSections } from './find-section.js';
import { getSectionText } from './read-section.js';

export function extractExampleSnippets(section: DocSection): string[] {
    const text = getSectionText(section);
    const lines = text.split(/\r?\n/);

    const examples: string[] = [];

    let inExampleArea = false;
    let collecting = false;
    let current: string[] = [];

    // First, try to find code blocks under ### Example
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

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

            examples.push(current.join('\n'));
            collecting = false;

            continue;
        }

        if (collecting) {
            current.push(line);
        }
    }

    // Only extract code blocks under ### Example. If none found, return empty array
    return examples;
}

export function buildQueryResults(names: string[]): {
    results: QueryResult[];
    matches: number;
} {
    const results: QueryResult[] = [];

    for (const queryName of names) {
        const section = findSection(queryName);

        if (!section) {
            results.push({
                query: queryName,
                found: false,
                suggestions: suggestSections(queryName),
            });
            continue;
        }

        const snippets = extractExampleSnippets(section);

        results.push({
            query: queryName,
            found: true,
            id: section.id,
            package: section.package || null,
            type: section.kind || null,
            examples: snippets,
            examplesReturned: snippets.length,
        });
    }

    const matches = results.filter((r) => r.found).length;

    return { results, matches };
}
