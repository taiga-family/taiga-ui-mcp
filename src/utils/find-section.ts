import {type DocSection} from '../schemas/doc-types.js';
import {state} from '../server/server.js';

export function findSection(name: string): DocSection | undefined {
    // Strip Tui/tui prefix: "TuiButton" → "Button", "tui-button" → "button"
    const stripped = name.replace(/^[Tt]ui[-_]?/, '');

    // Split camelCase/PascalCase into kebab: "IconButton" → "icon-button"
    const kebab = stripped.replaceAll(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

    // Last word of kebab: "icon-button" → "button" (useful for compound names like TuiIconButton)
    // Exclude generic Angular suffixes that match too broadly
    const GENERIC_SUFFIXES = new Set([
        'component',
        'context',
        'directive',
        'guard',
        'interceptor',
        'module',
        'options',
        'pipe',
        'service',
    ]);
    const kebabParts = kebab.split('-').filter(Boolean);
    const lastWordCandidate =
        kebabParts.length > 1 ? (kebabParts[kebabParts.length - 1] ?? '') : '';
    const lastWord = GENERIC_SUFFIXES.has(lastWordCandidate) ? '' : lastWordCandidate;

    const pascalCase = (stripped || name)
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
        stripped.toLowerCase(),
        kebab,
        lastWord,
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

    // Substring fallback — check all variants including stripped/kebab
    for (const variant of variants) {
        const substringMatch = state.sections.find((section) =>
            section.id.toLowerCase().includes(variant.toLowerCase()),
        );

        if (substringMatch) {
            return substringMatch;
        }
    }

    return undefined;
}

export function suggestSections(query: string): string[] {
    // Strip Tui prefix and convert to kebab for better matching
    const GENERIC_SUFFIXES = new Set([
        'component',
        'context',
        'directive',
        'guard',
        'interceptor',
        'module',
        'options',
        'pipe',
        'service',
    ]);
    const stripped = query.replace(/^[Tt]ui[-_]?/, '');
    const kebab = stripped.replaceAll(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    const parts = kebab
        .split('-')
        .filter((p) => !GENERIC_SUFFIXES.has(p) && p.length > 1);
    // Try full kebab first, then without generic suffixes
    const normalizedQuery = (parts.join('-') || kebab || stripped || query).toLowerCase();

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
