import {
    type ApiCoverage,
    type ApiDiff,
    type ApiProperty,
    type ApiPropertyChange,
    type ComponentChangeReason,
    type ComponentDiff,
    type ComponentDiffStatus,
    type DiffConfidence,
    type DocsDiff,
    type DocSection,
    type MigrationDiff,
    type MigrationImpact,
    type RenameCandidate,
} from '../schemas/doc-types.js';

function normalizePackageName(value?: string): string {
    return value?.trim().toUpperCase() ?? '';
}

function normalizeApiPropertyKey(property: string): string {
    const trimmed = property.trim();
    const twoWayMatch = /^\[\((.+)\)\]$/.exec(trimmed);

    if (twoWayMatch?.[1]) {
        return twoWayMatch[1].trim();
    }

    const inputMatch = /^\[(.+)\]$/.exec(trimmed);

    if (inputMatch?.[1]) {
        return inputMatch[1].trim();
    }

    const outputMatch = /^\((.+)\)$/.exec(trimmed);

    if (outputMatch?.[1]) {
        return outputMatch[1].trim();
    }

    return trimmed;
}

function normalizeText(value?: string | null): string {
    return value?.replaceAll(/\s+/g, ' ').trim() ?? '';
}

function normalizeCode(value?: string): string {
    return value?.trim() ?? '';
}

function buildExamplesFingerprint(section: DocSection | undefined): string {
    const examples = section?.parsedContent?.examples ?? [];

    return JSON.stringify(
        examples.map((example) => ({
            title: normalizeText(example.title),
            template: normalizeCode(example.template),
            typescript: normalizeCode(example.typescript),
            styles: normalizeCode(example.styles),
        })),
    );
}

function buildDocsDiff(
    oldSection: DocSection | undefined,
    newSection: DocSection | undefined,
): DocsDiff {
    const oldParsed = oldSection?.parsedContent;
    const newParsed = newSection?.parsedContent;

    return {
        descriptionChanged:
            normalizeText(oldParsed?.description) !==
            normalizeText(newParsed?.description),
        mainExampleChanged:
            `${oldParsed?.mainExample?.language ?? ''}:${normalizeCode(oldParsed?.mainExample?.code)}` !==
            `${newParsed?.mainExample?.language ?? ''}:${normalizeCode(newParsed?.mainExample?.code)}`,
        pageTypescriptChanged:
            normalizeCode(oldParsed?.pageTypescript) !==
            normalizeCode(newParsed?.pageTypescript),
        lessChanged: normalizeCode(oldParsed?.less) !== normalizeCode(newParsed?.less),
        examplesChanged:
            buildExamplesFingerprint(oldSection) !== buildExamplesFingerprint(newSection),
    };
}

function hasDocsChanges(diff: DocsDiff): boolean {
    return Object.values(diff).some(Boolean);
}

function countApiProperties(section: DocSection | undefined): number {
    const parsed = section?.parsedContent;

    return (parsed?.api?.inputs?.length ?? 0) + (parsed?.api?.outputs?.length ?? 0);
}

function buildApiCoverage(
    oldSection: DocSection | undefined,
    newSection: DocSection | undefined,
): ApiCoverage {
    const oldParsed = oldSection?.parsedContent;
    const newParsed = newSection?.parsedContent;

    return {
        oldHasParsedContent: !!oldParsed,
        newHasParsedContent: !!newParsed,
        oldHasApiSection: !!oldParsed?.api,
        newHasApiSection: !!newParsed?.api,
        oldApiProperties: countApiProperties(oldSection),
        newApiProperties: countApiProperties(newSection),
    };
}

function classifyMigrationImpact(
    status: ComponentDiffStatus,
    packageChange: {from: string; to: string} | null,
    apiDiff: {inputs: ApiDiff; outputs: ApiDiff} | null,
    docsOnly: boolean,
): MigrationImpact {
    if (status === 'removed') {
        return 'breaking';
    }

    if (status === 'added') {
        return 'non-breaking';
    }

    if (docsOnly) {
        return 'docs-only';
    }

    if (!packageChange && !apiDiff) {
        return status === 'unchanged' ? 'none' : 'unknown';
    }

    if (packageChange) {
        return 'likely-breaking';
    }

    const hasRemoved =
        (apiDiff?.inputs.removed.length ?? 0) > 0 ||
        (apiDiff?.outputs.removed.length ?? 0) > 0;
    const hasModified =
        (apiDiff?.inputs.modified.length ?? 0) > 0 ||
        (apiDiff?.outputs.modified.length ?? 0) > 0;
    const hasAdded =
        (apiDiff?.inputs.added.length ?? 0) > 0 ||
        (apiDiff?.outputs.added.length ?? 0) > 0;

    if (hasRemoved || hasModified) {
        return 'likely-breaking';
    }

    if (hasAdded) {
        return 'non-breaking';
    }

    return 'unknown';
}

function classifyDiffConfidence(
    status: ComponentDiffStatus,
    apiCoverage: ApiCoverage,
    packageChange: {from: string; to: string} | null,
    apiDiff: {inputs: ApiDiff; outputs: ApiDiff} | null,
): DiffConfidence {
    if (status === 'added' || status === 'removed') {
        return 'high';
    }

    if (
        !apiCoverage.oldHasParsedContent ||
        !apiCoverage.newHasParsedContent ||
        (!apiCoverage.oldHasApiSection && !apiCoverage.newHasApiSection)
    ) {
        return packageChange ? 'medium' : 'low';
    }

    if (packageChange || apiDiff) {
        return 'high';
    }

    return 'medium';
}

function getEntityNameFromId(id: string): string {
    return id.split('/').pop() ?? id;
}

function normalizeEntityName(name: string): string {
    return name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '');
}

function diceCoefficient(a: string, b: string): number {
    if (!a || !b) {
        return 0;
    }

    if (a === b) {
        return 1;
    }

    if (a.length < 2 || b.length < 2) {
        return a === b ? 1 : 0;
    }

    const makeBigrams = (value: string): string[] => {
        const bigrams: string[] = [];

        for (let i = 0; i < value.length - 1; i++) {
            bigrams.push(value.slice(i, i + 2));
        }

        return bigrams;
    };

    const aBigrams = makeBigrams(a);
    const bBigrams = makeBigrams(b);
    const bSet = new Map<string, number>();

    for (const bg of bBigrams) {
        bSet.set(bg, (bSet.get(bg) ?? 0) + 1);
    }

    let intersection = 0;

    for (const bg of aBigrams) {
        const count = bSet.get(bg) ?? 0;

        if (count > 0) {
            intersection++;
            bSet.set(bg, count - 1);
        }
    }

    return (2 * intersection) / (aBigrams.length + bBigrams.length);
}

function buildApiKeySet(section: DocSection | undefined): Set<string> {
    const keys = new Set<string>();

    for (const prop of section?.parsedContent?.api?.inputs ?? []) {
        keys.add(`i:${normalizeApiPropertyKey(prop.property)}`);
    }

    for (const prop of section?.parsedContent?.api?.outputs ?? []) {
        keys.add(`o:${normalizeApiPropertyKey(prop.property)}`);
    }

    return keys;
}

function jaccard(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 && setB.size === 0) {
        return 0;
    }

    let intersection = 0;

    for (const item of setA) {
        if (setB.has(item)) {
            intersection++;
        }
    }

    const union = setA.size + setB.size - intersection;

    return union > 0 ? intersection / union : 0;
}

function detectRenameCandidates(
    oldSections: readonly DocSection[],
    newSections: readonly DocSection[],
): RenameCandidate[] {
    const removed = oldSections.filter(
        (oldSection) =>
            !newSections.some((newSection) => newSection.id === oldSection.id),
    );
    const added = newSections.filter(
        (newSection) =>
            !oldSections.some((oldSection) => oldSection.id === newSection.id),
    );

    const candidates: RenameCandidate[] = [];
    const usedTargets = new Set<string>();

    for (const fromSection of removed) {
        let best: RenameCandidate | null = null;
        const fromName = normalizeEntityName(getEntityNameFromId(fromSection.id));
        const fromApi = buildApiKeySet(fromSection);

        for (const toSection of added) {
            if (usedTargets.has(toSection.id)) {
                continue;
            }

            const toName = normalizeEntityName(getEntityNameFromId(toSection.id));
            const nameScore = diceCoefficient(fromName, toName);
            const apiScore = jaccard(fromApi, buildApiKeySet(toSection));
            const score = nameScore * 0.7 + apiScore * 0.3;

            if (score < 0.72 && nameScore < 0.85) {
                continue;
            }

            if (!best || score > best.score) {
                best = {
                    fromId: fromSection.id,
                    toId: toSection.id,
                    score: Number(score.toFixed(3)),
                    reason: `nameSimilarity=${nameScore.toFixed(3)}, apiSimilarity=${apiScore.toFixed(3)}`,
                };
            }
        }

        if (best) {
            candidates.push(best);
            usedTargets.add(best.toId);
        }
    }

    return candidates;
}

function diffApiProperties(
    oldProps: readonly ApiProperty[],
    newProps: readonly ApiProperty[],
): ApiDiff {
    const oldMap = new Map(oldProps.map((p) => [normalizeApiPropertyKey(p.property), p]));
    const newMap = new Map(newProps.map((p) => [normalizeApiPropertyKey(p.property), p]));

    const added: ApiProperty[] = [];
    const removed: ApiProperty[] = [];
    const modified: ApiPropertyChange[] = [];

    for (const [prop, newEntry] of newMap) {
        const oldEntry = oldMap.get(prop);

        if (!oldEntry) {
            added.push(newEntry);
        } else if (oldEntry.type !== newEntry.type) {
            modified.push({
                property: newEntry.property,
                from: {type: oldEntry.type, description: oldEntry.description},
                to: {type: newEntry.type, description: newEntry.description},
            });
        }
    }

    for (const [prop, oldEntry] of oldMap) {
        if (!newMap.has(prop)) {
            removed.push(oldEntry);
        }
    }

    return {added, removed, modified};
}

function isApiDiffEmpty(diff: ApiDiff): boolean {
    return (
        diff.added.length === 0 && diff.removed.length === 0 && diff.modified.length === 0
    );
}

export function diffComponent(
    oldSection: DocSection | undefined,
    newSection: DocSection | undefined,
): ComponentDiff | null {
    if (!oldSection && !newSection) {
        return null;
    }

    const name =
        (newSection ?? oldSection)!.id.split('/').pop() ?? (newSection ?? oldSection)!.id;
    const id = (newSection ?? oldSection)!.id;

    if (!oldSection && newSection) {
        return {
            name,
            id,
            status: 'added',
            docsOnly: false,
            packageChange: null,
            apiDiff: null,
            apiCoverage: buildApiCoverage(oldSection, newSection),
            diffConfidence: 'high',
            migrationImpact: 'non-breaking',
            possibleRename: null,
            changeReasons: [],
            docsDiff: {
                descriptionChanged: false,
                mainExampleChanged: false,
                pageTypescriptChanged: false,
                lessChanged: false,
                examplesChanged: false,
            },
            descriptionChanged: false,
            pageTypescriptChanged: false,
        };
    }

    if (oldSection && !newSection) {
        return {
            name,
            id,
            status: 'removed',
            docsOnly: false,
            packageChange: null,
            apiDiff: null,
            apiCoverage: buildApiCoverage(oldSection, newSection),
            diffConfidence: 'high',
            migrationImpact: 'breaking',
            possibleRename: null,
            changeReasons: [],
            docsDiff: {
                descriptionChanged: false,
                mainExampleChanged: false,
                pageTypescriptChanged: false,
                lessChanged: false,
                examplesChanged: false,
            },
            descriptionChanged: false,
            pageTypescriptChanged: false,
        };
    }

    // Both exist — compare
    const docsDiff = buildDocsDiff(oldSection, newSection);
    const packageChange =
        normalizePackageName(oldSection!.package) !==
        normalizePackageName(newSection!.package)
            ? {
                  from: normalizePackageName(oldSection!.package),
                  to: normalizePackageName(newSection!.package),
              }
            : null;

    const inputsDiff = diffApiProperties(
        oldSection!.parsedContent?.api?.inputs ?? [],
        newSection!.parsedContent?.api?.inputs ?? [],
    );

    const outputsDiff = diffApiProperties(
        oldSection!.parsedContent?.api?.outputs ?? [],
        newSection!.parsedContent?.api?.outputs ?? [],
    );

    const changeReasons: ComponentChangeReason[] = [];
    const hasApiChanges = !isApiDiffEmpty(inputsDiff) || !isApiDiffEmpty(outputsDiff);
    const apiDiff = hasApiChanges ? {inputs: inputsDiff, outputs: outputsDiff} : null;
    const apiCoverage = buildApiCoverage(oldSection, newSection);

    if (packageChange) {
        changeReasons.push('package');
    }

    if (!isApiDiffEmpty(inputsDiff)) {
        changeReasons.push('api-inputs');
    }

    if (!isApiDiffEmpty(outputsDiff)) {
        changeReasons.push('api-outputs');
    }

    if (docsDiff.descriptionChanged) {
        changeReasons.push('docs-description');
    }

    if (docsDiff.mainExampleChanged) {
        changeReasons.push('docs-main-example');
    }

    if (docsDiff.pageTypescriptChanged) {
        changeReasons.push('docs-typescript');
    }

    if (docsDiff.lessChanged) {
        changeReasons.push('docs-less');
    }

    if (docsDiff.examplesChanged) {
        changeReasons.push('docs-examples');
    }

    const status: ComponentDiffStatus =
        packageChange || apiDiff ? 'modified' : 'unchanged';
    const docsOnly = status === 'unchanged' && hasDocsChanges(docsDiff);
    const migrationImpact = classifyMigrationImpact(
        status,
        packageChange,
        apiDiff,
        docsOnly,
    );
    const diffConfidence = classifyDiffConfidence(
        status,
        apiCoverage,
        packageChange,
        apiDiff,
    );

    return {
        name,
        id,
        status,
        docsOnly,
        packageChange,
        apiDiff,
        apiCoverage,
        diffConfidence,
        migrationImpact,
        possibleRename: null,
        changeReasons,
        docsDiff,
        descriptionChanged: docsDiff.descriptionChanged,
        pageTypescriptChanged: docsDiff.pageTypescriptChanged,
    };
}

export function diffAllComponents(
    oldSections: readonly DocSection[],
    newSections: readonly DocSection[],
): MigrationDiff {
    const oldMap = new Map(oldSections.map((s) => [s.id, s]));
    const newMap = new Map(newSections.map((s) => [s.id, s]));

    const allIds = new Set([...newMap.keys(), ...oldMap.keys()]);
    const components: ComponentDiff[] = [];

    for (const id of allIds) {
        const diff = diffComponent(oldMap.get(id), newMap.get(id));

        if (diff) {
            components.push(diff);
        }
    }

    components.sort((a, b) => {
        const statusOrder: Record<ComponentDiffStatus, number> = {
            removed: 0,
            modified: 1,
            added: 2,
            unchanged: 3,
        };

        return statusOrder[a.status] - statusOrder[b.status];
    });

    const renameCandidates = detectRenameCandidates(oldSections, newSections);

    for (const candidate of renameCandidates) {
        const removedDiff = components.find((diff) => diff.id === candidate.fromId);
        const addedDiff = components.find((diff) => diff.id === candidate.toId);

        if (removedDiff) {
            removedDiff.possibleRename = candidate;

            if (!removedDiff.changeReasons.includes('possible-rename')) {
                removedDiff.changeReasons.push('possible-rename');
            }
        }

        if (addedDiff) {
            addedDiff.possibleRename = candidate;

            if (!addedDiff.changeReasons.includes('possible-rename')) {
                addedDiff.changeReasons.push('possible-rename');
            }
        }
    }

    const summary = {
        added: components.filter((c) => c.status === 'added').length,
        removed: components.filter((c) => c.status === 'removed').length,
        modified: components.filter((c) => c.status === 'modified').length,
        unchanged: components.filter((c) => c.status === 'unchanged').length,
        docsChanged: components.filter((c) => hasDocsChanges(c.docsDiff)).length,
        docsOnlyChanged: components.filter(
            (c) => c.status === 'unchanged' && hasDocsChanges(c.docsDiff),
        ).length,
        potentiallyRenamed: renameCandidates.length,
        lowConfidence: components.filter((c) => c.diffConfidence === 'low').length,
        apiParseGaps: components.filter(
            (c) =>
                !c.apiCoverage.oldHasParsedContent || !c.apiCoverage.newHasParsedContent,
        ).length,
    };

    return {components, renameCandidates, summary};
}
