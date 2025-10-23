import type {DocSection, QueryResult} from '../schemas/doc-types.js';
import {findSection, suggestSections} from './find-section.js';

export function extractContentSnippets(section: DocSection): string[] {
    const text = section.content || '';
    const trimmed = text.trim();

    if (!trimmed) {
        return [];
    }

    const cleaned = trimmed
        .split(/\r?\n/)
        .map((line) => line.replace(/^#{1,6}\s*/, ''))
        .join('\n')
        .trim();

    return cleaned ? [cleaned] : [];
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
            package: section.package ?? null,
            type: section.kind ?? null,
        };

        if (snippets.length) {
            foundResult.content = snippets;
        }

        results.push(foundResult);
    }

    const matches = results.filter((result) => !!result.id).length;

    return {results, matches};
}
