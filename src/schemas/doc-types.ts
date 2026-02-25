export interface ApiProperty {
    property: string;
    type: string;
    description: string;
}

export interface CodeBlock {
    language: string;
    code: string;
}

export interface ComponentExample {
    title: string;
    template?: string;
    typescript?: string;
    styles?: string;
}

export interface ComponentContent {
    description: string | null;
    mainExample: CodeBlock | null;
    api: {
        inputs?: ApiProperty[];
        outputs?: ApiProperty[];
    } | null;
    less?: string;
    pageTypescript?: string;
    examples: ComponentExample[];
}

export interface QueryResult {
    query: string;
    id?: string;
    package?: string | null;
    type?: string | null;
    suggestions?: string[];
    content?: ComponentContent;
}

export interface DocSection {
    id: string;
    title: string;
    content: string;
    package?: string;
    kind?: string;
    parsedContent?: ComponentContent;
}
