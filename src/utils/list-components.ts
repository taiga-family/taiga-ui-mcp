import { state } from '../server/server.js';

export interface ListedComponent {
    id: string;
    name: string;
    category: string;
    package: string | null;
    type: string | null;
}

export function constructComponentsList(query?: string): {
    items: ListedComponent[];
    normalizedQuery: string | null;
} {
    let normalizedQuery = query ? query.toLowerCase() : null;

    if (normalizedQuery?.startsWith('tui')) {
        normalizedQuery = normalizedQuery.substring(3);
    }

    const items: ListedComponent[] = state.sections
        .filter(
            (section) =>
                !normalizedQuery ||
                section.id.toLowerCase().includes(normalizedQuery)
        )
        .map((section) => {
            const idParts = section.id.split('/');
            const name = idParts[idParts.length - 1] || section.id;
            const category = idParts[0] || '';

            return {
                id: section.id,
                name,
                category,
                package: section.package ?? null,
                type: section.kind ?? null,
            };
        });

    return { items, normalizedQuery };
}
