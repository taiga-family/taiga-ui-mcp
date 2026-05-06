export interface SubsectionItem {
    section: string;
    code?: string;
}

export interface NestedItem {
    title: string;
    content: string[];
    code?: string;
    sections?: SubsectionItem[];
}

export interface Subsection {
    title: string;
    content: string[];
    sections?: SubsectionItem[];
    items?: NestedItem[];
}

export interface HeaderSection {
    title: string;
    description: string;
    criticalNotices: string[];
    subsections: Subsection[];
}

export interface ParsedHeader {
    title: string;
    sections: HeaderSection[];
}

/**
 * Extracts the documentation header from raw content.
 * Header is everything before the first "# components/" heading.
 */
export function extractHeaderContent(rawContent: string): string {
    const lines = rawContent.split(/\r?\n/);
    const headerLines: string[] = [];

    for (const line of lines) {
        if (/^#\s+components\//.test(line)) {
            break;
        }

        headerLines.push(line);
    }

    return headerLines.join('\n').trim();
}

/**
 * Finds the line number where components section starts.
 */
export function findComponentsSectionStart(rawContent: string): number {
    const lines = rawContent.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line && /^#\s+components\//.test(line)) {
            return i;
        }
    }

    return lines.length;
}

/**
 * Parses code blocks from content lines.
 */
function extractCodeBlocks(content: string): Array<{language: string; code: string}> {
    const codeBlocks: Array<{language: string; code: string}> = [];
    const lines = content.split('\n');
    let inCodeBlock = false;
    let currentLang = '';
    let currentCode: string[] = [];

    for (const line of lines) {
        if (line.startsWith('```')) {
            if (inCodeBlock) {
                // End of code block
                codeBlocks.push({
                    language: currentLang,
                    code: currentCode.join('\n').trim(),
                });
                currentCode = [];
                inCodeBlock = false;
            } else {
                // Start of code block
                currentLang = line.slice(3).trim() || 'plaintext';
                inCodeBlock = true;
            }
        } else if (inCodeBlock) {
            currentCode.push(line);
        }
    }

    return codeBlocks;
}

/**
 * Extracts plain text content (removes markdown formatting, code blocks, etc).
 */
function extractPlainContent(content: string): string[] {
    const lines = content.split('\n');
    const plainLines: string[] = [];
    let inCodeBlock = false;

    for (const line of lines) {
        // Skip code blocks
        if (line.startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            continue;
        }

        if (inCodeBlock) {
            continue;
        }

        // Skip empty lines
        if (!line.trim()) {
            continue;
        }

        // Skip markdown headings (they're already captured)
        if (/^#{1,6}\s+/.test(line)) {
            continue;
        }

        // Skip horizontal rules
        if (/^-{3,}\s*$/.test(line)) {
            continue;
        }

        // Skip blockquotes with **Critical** or **Auto-generated** (already extracted)
        if (line.includes('**Critical**:') || line.includes('**Auto-generated**:')) {
            continue;
        }

        // Clean up other blockquotes
        let cleaned = line.replace(/^>\s*/, '').trim();

        // Remove bold/italic markers
        cleaned = cleaned.replaceAll(/\*\*([^*]+)\*\*/g, '$1');
        cleaned = cleaned.replaceAll(/\*([^*]+)\*/g, '$1');

        // Remove inline code markers
        cleaned = cleaned.replaceAll(/`([^`]+)`/g, '$1');

        if (cleaned) {
            plainLines.push(cleaned);
        }
    }

    return plainLines;
}

/**
 * Parses a section into structured data.
 */
function parseSection(content: string): HeaderSection {
    const lines = content.split('\n');
    const subsections: Subsection[] = [];
    const description: string[] = [];
    const criticalNotices: string[] = [];
    let title = '';

    // Find all headings (both markdown # and **bold:** patterns)
    const headings: Array<{line: number; level: number; title: string}> = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (!line) {
            continue;
        }

        // Extract title from first heading
        const h1Match = /^#\s+([^#]\S.*)$/.exec(line);

        if (h1Match?.[1] && !title) {
            title = h1Match[1].trim();
            headings.push({line: i, level: 1, title: h1Match[1].trim()});
            continue;
        }

        // Extract subsections (##, ###, etc)
        const hMatch = /^(#{2,6})\s+(\S.*)$/.exec(line);

        if (hMatch?.[1] && hMatch[2]) {
            const level = hMatch[1].length;

            headings.push({line: i, level, title: hMatch[2].trim()});
            continue;
        }

        // Extract **Bold:** headings (treat as level 2)
        const boldMatch = /^\*\*(.+):\*\*$/.exec(line);

        if (boldMatch?.[1]) {
            headings.push({line: i, level: 2, title: `${boldMatch[1].trim()}:`});
        }

        // Extract critical notices
        if (line.startsWith('> **Critical**:')) {
            const notice = line.replace(/^>\s*\*\*Critical\*\*:\s*/, '').trim();

            if (notice) {
                criticalNotices.push(notice);
            }
        }
    }

    // Extract description (content before first subsection)
    if (headings.length > 0 && headings[0]) {
        const firstSubsectionLine = headings.find((h) => h.level > 1)?.line;
        const descEnd = firstSubsectionLine ?? lines.length;
        const descContent = lines.slice(headings[0].line + 1, descEnd).join('\n');

        description.push(...extractPlainContent(descContent));
    }

    // Parse subsections - group bold headings under level-3, level-3 under level-2
    let currentSubsection: Subsection | null = null;
    let currentItem: NestedItem | null = null;
    let currentGroup: NestedItem | null = null;

    const pushCurrentItem = (): void => {
        if (!currentItem || !currentSubsection) {
            return;
        }

        if (
            currentItem.content.length > 0 ||
            currentItem.code ||
            (currentItem.sections && currentItem.sections.length > 0)
        ) {
            currentSubsection.items = currentSubsection.items || [];
            currentSubsection.items.push(currentItem);
        }

        currentItem = null;
    };

    const pushCurrentGroup = (): void => {
        if (!currentGroup || !currentSubsection) {
            return;
        }

        if (
            currentGroup.content.length > 0 ||
            (currentGroup.sections && currentGroup.sections.length > 0)
        ) {
            currentSubsection.items = currentSubsection.items || [];
            currentSubsection.items.push(currentGroup);
        }

        currentGroup = null;
    };

    const addSectionToItem = (
        item: NestedItem,
        sectionItem: SubsectionItem,
        plainContent: string[],
    ): void => {
        item.sections = item.sections || [];
        item.sections.push(sectionItem);

        if (plainContent.length > 0) {
            item.content.push(...plainContent);
        }
    };

    for (let i = 1; i < headings.length; i++) {
        const current = headings[i];

        if (!current) {
            continue;
        }

        const start = current.line;
        const end = headings[i + 1]?.line ?? lines.length;
        const subsectionContent = lines.slice(start + 1, end).join('\n');

        // Level 2 heading (##) - create new subsection
        if (current.level === 2 && !current.title.endsWith(':')) {
            // Save previous subsection and item (only if they have content)
            pushCurrentItem();
            pushCurrentGroup();

            if (currentSubsection) {
                // Only push if has content
                if (
                    currentSubsection.content.length > 0 ||
                    (currentSubsection.sections &&
                        currentSubsection.sections.length > 0) ||
                    (currentSubsection.items && currentSubsection.items.length > 0)
                ) {
                    subsections.push(currentSubsection);
                }
            }

            const [block] = extractCodeBlocks(subsectionContent);

            const subsectionSections = block
                ? [
                      {
                          section: current.title,
                          code: block.code,
                      },
                  ]
                : [];

            currentSubsection = {
                title: current.title,
                content: extractPlainContent(subsectionContent),
                sections: subsectionSections,
                items: [],
            };
        }
        // Level 3 heading (###) - create new nested item
        else if (current.level === 3 && !current.title.endsWith(':')) {
            const plainContent = extractPlainContent(subsectionContent);
            const codeBlocks = extractCodeBlocks(subsectionContent);
            const code = codeBlocks.length > 0 ? codeBlocks[0]?.code : undefined;

            if (currentGroup && currentSubsection) {
                const sectionItem: SubsectionItem = {
                    section: current.title,
                    code,
                };

                currentGroup.sections = currentGroup.sections || [];
                currentGroup.sections.push(sectionItem);

                if (plainContent.length > 0) {
                    currentGroup.content.push(...plainContent);
                }

                continue;
            }

            // Save previous item (only if it has content or sections)
            pushCurrentItem();

            currentItem = {
                title: current.title,
                content: plainContent,
                ...(code ? {code} : {}),
                sections: [],
            };
        }
        // Bold heading (ends with :) - add to current context
        else if (current.title.endsWith(':')) {
            const codeBlocks = extractCodeBlocks(subsectionContent);
            const code = codeBlocks.length > 0 ? codeBlocks[0]?.code : undefined;
            const plainContent = extractPlainContent(subsectionContent);
            const nextHeading = headings[i + 1];

            if (currentSubsection && !currentItem && nextHeading?.level === 3) {
                pushCurrentGroup();

                currentGroup = {
                    title: current.title.replace(/:\s*$/, ''),
                    content: plainContent,
                    ...(code ? {code} : {}),
                    sections: [],
                };
                currentItem = null;
            } else {
                const sectionItem: SubsectionItem = {
                    section: current.title,
                    code,
                };

                if (currentItem) {
                    addSectionToItem(currentItem, sectionItem, plainContent);
                    continue;
                }

                if (currentSubsection) {
                    currentSubsection.sections = currentSubsection.sections || [];
                    currentSubsection.sections.push(sectionItem);
                    continue;
                }

                // Standalone bold heading
                subsections.push({
                    title: current.title,
                    content: plainContent,
                    sections: code ? [sectionItem] : undefined,
                });
            }
        }
        // Other headings - handle as needed
        else {
            pushCurrentItem();
            pushCurrentGroup();

            if (currentSubsection) {
                subsections.push(currentSubsection);
                currentSubsection = null;
            }

            const plainContent = extractPlainContent(subsectionContent);
            const codeBlocks = extractCodeBlocks(subsectionContent);

            subsections.push({
                title: current.title,
                content: plainContent,
                sections:
                    codeBlocks.length > 0
                        ? [{section: current.title, code: codeBlocks[0]?.code}]
                        : undefined,
            });
        }
    }

    // Push last item/group and subsection (only if they have content)
    pushCurrentItem();
    pushCurrentGroup();

    if (currentSubsection) {
        // Only push subsection if it has content, sections, or items
        if (
            currentSubsection.content.length > 0 ||
            (currentSubsection.sections && currentSubsection.sections.length > 0) ||
            (currentSubsection.items && currentSubsection.items.length > 0)
        ) {
            subsections.push(currentSubsection);
        }
    }

    // Special handling for .md files: if no subsections were created but there's code content
    // (typical for installation guide files), create a subsection with the code
    if (subsections.length === 0 && headings.length === 1 && headings[0]) {
        // Get content after the title heading
        const contentAfterTitle = lines.slice(headings[0].line + 1).join('\n');
        const codeBlocks = extractCodeBlocks(contentAfterTitle);

        if (codeBlocks.length > 0 && codeBlocks[0]) {
            // Create a subsection with code directly in content
            subsections.push({
                title: '', // Empty title for direct code under h1
                content: [codeBlocks[0].code], // Put code as single string in content
            });
        }
    }

    const descriptionText = description.join('\n');

    return {
        title,
        description: descriptionText || '',
        criticalNotices,
        subsections,
    };
}

/**
 * Parses the header content into fully structured JSON.
 */
export function parseHeaderSections(headerContent: string): ParsedHeader {
    const lines = headerContent.split(/\r?\n/);
    const sections: HeaderSection[] = [];
    const title = 'Taiga UI - Complete Documentation';

    // Find main sections (level-1 headings)
    const sectionIndices: Array<{line: number; title: string}> = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (!line) {
            continue;
        }

        // Level-1 heading
        const h1Match = /^#\s+([^#]\S.*)$/.exec(line);

        if (h1Match?.[1]) {
            sectionIndices.push({
                line: i,
                title: h1Match[1].trim(),
            });
        }
    }

    // Parse each section
    for (let i = 0; i < sectionIndices.length; i++) {
        const currentSection = sectionIndices[i];

        if (!currentSection) {
            continue;
        }

        const start = currentSection.line;
        const end = sectionIndices[i + 1]?.line ?? lines.length;
        const sectionContent = lines.slice(start, end).join('\n');
        const parsedSection = parseSection(sectionContent);

        sections.push(parsedSection);
    }

    const compactSections = sections.map((section) => {
        const hasMarkdownSubsections = section.subsections.some((subsection) =>
            subsection.title.endsWith('.md'),
        );

        return hasMarkdownSubsections
            ? {
                  ...section,
                  subsections: section.subsections.map((subsection) => {
                      const redundantSingleCodeSection =
                          subsection.content.length === 0 &&
                          !subsection.items?.length &&
                          subsection.sections?.length === 1 &&
                          subsection.sections[0]?.section === subsection.title &&
                          Boolean(subsection.sections[0].code);

                      return redundantSingleCodeSection
                          ? {
                                title: subsection.title,
                                content: [subsection.sections?.[0]?.code ?? ''],
                            }
                          : subsection;
                  }),
              }
            : section;
    });

    return {
        title,
        sections: compactSections,
    };
}
