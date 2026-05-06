import {type DocSection} from '../schemas/doc-types.js';
import {state} from '../server/server.js';

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

function normalizeToKebab(name: string): string {
    const stripped = name.replace(/^[Tt]ui[-_]?/, '');

    return stripped.replaceAll(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

export function findSection(name: string): DocSection | undefined {
    const stripped = name.replace(/^[Tt]ui[-_]?/, '');
    const kebab = normalizeToKebab(name);

    // Last word of kebab: "icon-button" → "button" (useful for compound names like TuiIconButton)
    // Exclude generic Angular suffixes that match too broadly
    const kebabParts = kebab.split('-').filter(Boolean);

    const lastWordCandidate =
        kebabParts.length > 1 ? (kebabParts[kebabParts.length - 1] ?? '') : '';

    const lastWord = GENERIC_SUFFIXES.has(lastWordCandidate) ? '' : lastWordCandidate;

    const pascalCase = (stripped || name)
        .toLowerCase()
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join('');

    const tuiVariant = pascalCase.startsWith('Tui') ? pascalCase : `Tui${pascalCase}`;

    // All variants pre-lowercased to avoid repeated .toLowerCase() in loops
    const variants = [
        name.toLowerCase(),
        stripped.toLowerCase(),
        kebab,
        lastWord,
        pascalCase.toLowerCase(),
        tuiVariant.toLowerCase(),
    ].filter(Boolean);

    // Pre-compute per-section data once per call
    const sections = state.sections.map((section) => ({
        section,
        id: section.id.toLowerCase(),
        segment: section.id.split('/').pop()?.toLowerCase() ?? '',
    }));

    // Exact match
    for (const variant of variants) {
        const match = sections.find((s) => s.id === variant);

        if (match) {
            return match.section;
        }
    }

    // Last path segment match
    for (const variant of variants) {
        const match = sections.find((s) => s.segment === variant);

        if (match) {
            return match.section;
        }
    }

    // Ends-with match
    for (const variant of variants) {
        const match = sections.find((s) => s.id.endsWith(`/${variant}`));

        if (match) {
            return match.section;
        }
    }

    // Substring fallback — check all variants including stripped/kebab
    for (const variant of variants) {
        const match = sections.find((s) => s.id.includes(variant));

        if (match) {
            return match.section;
        }
    }

    return undefined;
}

export function suggestSections(query: string): string[] {
    const kebab = normalizeToKebab(query);

    const parts = kebab
        .split('-')
        .filter((p) => !GENERIC_SUFFIXES.has(p) && p.length > 1);
    // Try full kebab first, then without generic suffixes
    const normalizedQuery = (parts.join('-') || kebab || query).toLowerCase();
    const results: Array<{id: string; score: number}> = [];

    for (const section of state.sections) {
        const idLower = section.id.toLowerCase();
        const matchIndex = idLower.indexOf(normalizedQuery);

        if (matchIndex !== -1) {
            results.push({
                id: section.id,
                score:
                    matchIndex * 10 + Math.abs(idLower.length - normalizedQuery.length),
            });
        }
    }

    return results.sort((a, b) => a.score - b.score).map((r) => r.id);
}
