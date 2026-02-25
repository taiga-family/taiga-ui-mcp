import {type ComponentContent, type QueryResult} from '../schemas/doc-types.js';
import {findSection, suggestSections} from './find-section.js';
import {parseComponentSection} from './parse-component-section.js';

export function extractStructuredContent(
    rawContent: string,
    precomputed?: ComponentContent,
): ComponentContent | undefined {
    if (precomputed) {
        return precomputed;
    }

    const trimmed = rawContent.trim();

    if (!trimmed) {
        return undefined;
    }

    return parseComponentSection(trimmed);
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

        const structured = extractStructuredContent(
            section.content,
            section.parsedContent,
        );

        const foundResult: QueryResult = {
            query: queryName,
            id: section.id,
            package: section.package ?? null,
            type: section.kind ?? null,
        };

        if (structured) {
            foundResult.content = structured;
        }

        results.push(foundResult);
    }

    const matches = results.filter((result) => !!result.id).length;

    return {results, matches};
}
