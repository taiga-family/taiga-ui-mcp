import {parseContent} from '../utils/parse-content.js';
import {DEFAULT_VERSION, getState} from './server.js';

// 6-hour refresh window
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

const sourceUrlMap = new Map<string, string>();

export function resolveSourceUrls(): Map<string, string> {
    if (sourceUrlMap.size > 0) {
        return sourceUrlMap;
    }

    const mainUrl =
        process.argv.find((arg) => arg.startsWith('--source-url='))?.split('=')[1] ??
        process.env.SOURCE_URL;

    if (mainUrl) {
        sourceUrlMap.set(DEFAULT_VERSION, mainUrl);
    }

    const v4Url =
        process.argv.find((arg) => arg.startsWith('--v4-source-url='))?.split('=')[1] ??
        process.env.V4_SOURCE_URL;

    if (v4Url) {
        sourceUrlMap.set('v4', v4Url);
    }

    return sourceUrlMap;
}

export async function fetchSource(sourceUrl: string): Promise<string> {
    const response = await fetch(sourceUrl).catch((error: unknown) => {
        throw new Error(
            `Network error fetching documentation source: ${error instanceof Error ? error.message : String(error)}`,
        );
    });

    if (!response.ok) {
        throw new Error(
            `Failed to fetch documentation (HTTP ${response.status} ${response.statusText}) from ${sourceUrl}`,
        );
    }

    const content = await response.text();

    if (!content.trim()) {
        throw new Error(`Fetched documentation from ${sourceUrl} is empty.`);
    }

    return content;
}

export function getSourceUrl(version: string): string | undefined {
    return resolveSourceUrls().get(version);
}

export async function ensureSourceLoaded(version = DEFAULT_VERSION): Promise<void> {
    const urls = resolveSourceUrls();
    const sourceUrl = urls.get(version);

    if (!sourceUrl) {
        if (version === DEFAULT_VERSION) {
            throw new Error(
                'Source URL not provided. Set SOURCE_URL or pass --source-url=...',
            );
        }

        throw new Error(
            `Source URL for version "${version}" not configured. Pass --${version}-source-url=...`,
        );
    }

    const s = getState(version);
    const isContentStale =
        !s.lastLoadedAt || Date.now() - s.lastLoadedAt > REFRESH_INTERVAL_MS;

    if (!s.sections.length || isContentStale) {
        const content = await fetchSource(sourceUrl);
        const parsed = parseContent(content, sourceUrl);

        s.sections = parsed.sections;
        s.overview = parsed.overview;
        s.sourceUrl = parsed.sourceUrl;
        s.lastLoadedAt = Date.now();
    }
}
