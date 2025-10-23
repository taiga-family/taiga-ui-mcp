import type {DocSection} from '../schemas/doc-types.js';
import {state} from '../server/server.js';

export function findSection(name: string): DocSection | undefined {
    const pascalCase = name
        .toLowerCase()
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');

    const camelCase = pascalCase
        ? pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1)
        : '';

    const tuiVariant = pascalCase.startsWith('Tui') ? pascalCase : `Tui${pascalCase}`;

    const variants = [
        name.toLowerCase(),
        pascalCase,
        camelCase,
        tuiVariant,
        tuiVariant.toLowerCase(),
    ].filter(Boolean);

    // Exact match
    for (const variant of variants) {
        const exactMatch = state.sections.find(
            (section) => section.id.toLowerCase() === variant.toLowerCase(),
        );

        if (exactMatch) {
            return exactMatch;
        }
    }

    // Last path segment match
    for (const variant of variants) {
        const segmentMatch = state.sections.find(
            (section) =>
                section.id.split('/').pop()?.toLowerCase() === variant.toLowerCase(),
        );

        if (segmentMatch) {
            return segmentMatch;
        }
    }

    // Ends-with match
    for (const variant of variants) {
        const endsWithMatch = state.sections.find((section) =>
            section.id.toLowerCase().endsWith(`/${variant.toLowerCase()}`),
        );

        if (endsWithMatch) {
            return endsWithMatch;
        }
    }

    // Substring fallback
    const substringMatch = state.sections.find((section) =>
        section.id.toLowerCase().includes(name.toLowerCase()),
    );

    if (substringMatch) {
        return substringMatch;
    }

    return undefined;
}

export function suggestSections(query: string): string[] {
    const normalizedQuery = query.toLowerCase();

    return state.sections
        .map((section) => {
            const sectionIdLower = section.id.toLowerCase();
            const matchIndex = sectionIdLower.indexOf(normalizedQuery);

            return matchIndex === -1
                ? null
                : {
                      id: section.id,
                      score:
                          matchIndex * 10 +
                          Math.abs(sectionIdLower.length - normalizedQuery.length),
                  };
        })
        .filter((candidate): candidate is {id: string; score: number} => !!candidate)
        .sort((a, b) => a.score - b.score)
        .map((result) => result.id);
}
