import { state } from '../server/server.js';

export interface ListedComponent {
    id: string;
    name: string;
    category: string;
    package: string;
    type: string;
}

export function constructComponentsList(query?: string): {
    items: ListedComponent[];
    normalizedQuery: string | null;
} {
    const normalizedQuery = query ? query.toLowerCase() : null;

    const items: ListedComponent[] = state.sections
        .filter(
            (section) =>
                !normalizedQuery ||
                section.id.toLowerCase().includes(normalizedQuery)
        )
        .map((section) => {
            const name = section.id.split('/').pop() || section.id;
            const category = section.id.split('/')[0];

            return {
                id: section.id,
                name,
                category,
                package: section.package || '',
                type: section.kind || '',
            };
        });

    return { items, normalizedQuery };
}
