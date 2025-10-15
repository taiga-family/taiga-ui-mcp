export interface QueryResult {
    query: string;
    found: boolean;
    id?: string;
    package?: string | null;
    type?: string | null;
    suggestions?: string[];
    examples?: string[];
    examplesReturned?: number;
}

export interface DocSection {
    id: string;
    title: string;
    start: number;
    end: number;
    startByte?: number;
    endByte?: number;
    package?: string;
    kind?: string;
}
