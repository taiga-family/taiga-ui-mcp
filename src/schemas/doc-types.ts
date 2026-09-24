export interface QueryResult {
    query: string;
    id?: string;
    package?: string | null;
    type?: string | null;
    version?: string | null;
    suggestions?: string[];
    content?: string[];
}

export interface DocSection {
    id: string;
    title: string;
    content: string;
    package?: string;
    kind?: string;
    version?: string;
}
