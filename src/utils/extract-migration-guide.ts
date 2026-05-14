export interface MigrationSection {
    title: string;
    content: string[];
    codeBlocks?: string[];
    subsections?: MigrationSubsection[];
}

export interface MigrationSubsection {
    title: string;
    content: string[];
    codeBlocks?: string[];
}

export interface ParsedMigrationGuide {
    title: string;
    introduction: string[];
    sections: MigrationSection[];
}

export function extractMigrationGuideContent(rawContent: string): string | undefined {
    if (!rawContent.trim()) {
        return undefined;
    }

    const lines = rawContent.split(/\r?\n/);
    let startIndex = -1;
    let endIndex = lines.length;
    const migrationGuideRegex = /^#\s+Migration\s+Guide/i;
    const componentsRegex = /^#\s+components\//;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (!line) {
            continue;
        }

        if (line === '---' && migrationGuideRegex.exec(lines[i + 1] ?? '')) {
            startIndex = i;
            continue;
        }

        if (startIndex !== -1 && componentsRegex.exec(line)) {
            endIndex = i;
            break;
        }
    }

    return startIndex === -1
        ? undefined
        : lines.slice(startIndex, endIndex).join('\n').trim();
}

export function parseMigrationGuide(migrationContent: string): ParsedMigrationGuide {
    const lines = migrationContent.split(/\r?\n/);
    let title = 'Migration Guide';
    const introduction: string[] = [];
    const sections: MigrationSection[] = [];
    let currentSection: MigrationSection | null = null;
    let currentSubsection: MigrationSubsection | null = null;
    let inCodeBlock = false;
    let inHtmlComment = false;
    let currentCode: string[] = [];

    const appendCode = (code: string): void => {
        if (currentSubsection) {
            currentSubsection.codeBlocks = currentSubsection.codeBlocks || [];
            currentSubsection.codeBlocks.push(code);

            return;
        }

        if (currentSection) {
            currentSection.codeBlocks = currentSection.codeBlocks || [];
            currentSection.codeBlocks.push(code);
        }
    };

    const pushCurrentSubsection = (): void => {
        if (!currentSubsection || !currentSection) {
            return;
        }

        if (
            currentSubsection.content.length > 0 ||
            (currentSubsection.codeBlocks && currentSubsection.codeBlocks.length > 0)
        ) {
            currentSection.subsections = currentSection.subsections || [];
            currentSection.subsections.push(currentSubsection);
        }

        currentSubsection = null;
    };

    const pushCurrentSection = (): void => {
        if (!currentSection) {
            return;
        }

        pushCurrentSubsection();

        if (
            currentSection.content.length > 0 ||
            (currentSection.codeBlocks && currentSection.codeBlocks.length > 0) ||
            (currentSection.subsections && currentSection.subsections.length > 0)
        ) {
            sections.push(currentSection);
        }

        currentSection = null;
    };

    for (const line of lines) {
        if (line.startsWith('```')) {
            if (inCodeBlock) {
                inCodeBlock = false;

                const code = currentCode.join('\n');

                if (code || currentCode.length > 0) {
                    appendCode(code);
                }

                currentCode = [];
            } else {
                inCodeBlock = true;
            }

            continue;
        }

        if (inCodeBlock) {
            currentCode.push(line);
            continue;
        }

        if (inHtmlComment) {
            if (line.includes('-->')) {
                inHtmlComment = false;
            }

            continue;
        }

        if (line.startsWith('<!--')) {
            inHtmlComment = !line.includes('-->');
            continue;
        }

        if (!line || line === '---') {
            continue;
        }

        const h1Match = /^# ([^#\n]+)$/.exec(line);

        if (h1Match?.[1]) {
            pushCurrentSection();
            title = h1Match[1].trim();
            continue;
        }

        const h2Match = /^## ([^#\n]+)$/.exec(line);

        if (h2Match?.[1]) {
            pushCurrentSection();

            currentSection = {
                title: h2Match[1].trim(),
                content: [],
            };
            continue;
        }

        const h3Match = /^### ([^#\n]+)$/.exec(line);

        if (h3Match?.[1]) {
            pushCurrentSubsection();

            currentSubsection = {
                title: h3Match[1].trim(),
                content: [],
            };
            continue;
        }

        if (line.startsWith('>')) {
            const cleaned = line.replace(/^>\s*/, '').trim();

            if (!cleaned) {
                continue;
            }

            if (currentSubsection) {
                currentSubsection.content.push(cleaned);
            } else if (currentSection) {
                currentSection.content.push(cleaned);
            } else {
                introduction.push(cleaned);
            }

            continue;
        }

        if (line.startsWith('- ')) {
            const cleaned = line.slice(2).trim();

            if (!cleaned) {
                continue;
            }

            if (currentSubsection) {
                currentSubsection.content.push(`- ${cleaned}`);
            } else if (currentSection) {
                currentSection.content.push(`- ${cleaned}`);
            } else {
                introduction.push(`- ${cleaned}`);
            }

            continue;
        }

        if (line.startsWith('---')) {
            continue;
        }

        const cleaned = line.trim();

        if (cleaned) {
            if (currentSubsection) {
                currentSubsection.content.push(cleaned);
            } else if (currentSection) {
                currentSection.content.push(cleaned);
            } else {
                introduction.push(cleaned);
            }
        }
    }

    if (inCodeBlock && currentCode.length > 0) {
        appendCode(currentCode.join('\n'));
    }

    pushCurrentSubsection();
    pushCurrentSection();

    return {
        title,
        introduction,
        sections,
    };
}
