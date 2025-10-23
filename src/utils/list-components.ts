import {state} from '../server/server.js';

export interface ListedComponent {
    id: string;
    name: string;
    category: string;
    package: string | null;
    type: string | null;
}

export function constructComponentsList(query = ''): {
    items: ListedComponent[];
    normalizedQuery: string | null;
} {
    const normalizedQuery = query?.toLowerCase().replace(/^tui/, '');

    const items: ListedComponent[] = state.sections
        .filter(
            (section) =>
                !normalizedQuery || section.id.toLowerCase().includes(normalizedQuery),
        )
        .map((section) => {
            const idParts = section.id.split('/');
            const name = idParts[idParts.length - 1] ?? section.id;
            const category = idParts[0] ?? '';

            return {
                id: section.id,
                name,
                category,
                package: section.package ?? null,
                type: section.kind ?? null,
            };
        });

    return {items, normalizedQuery};
}
