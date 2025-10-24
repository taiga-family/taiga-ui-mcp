import {parseContent} from '../utils/parse-content.js';
import {state} from './server.js';

// 6-hour refresh window
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

export async function fetchSource(): Promise<{url: string; content: string}> {
    const argProvidedUrl = process.argv
        .find((arg) => arg.startsWith('--source-url='))
        ?.split('=')[1];

    const sourceUrl = argProvidedUrl ?? process.env.SOURCE_URL;

    if (!sourceUrl) {
        throw new Error(
            'Source URL not provided. Set SOURCE_URL or pass --source-url=...',
        );
    }

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

    return {url: sourceUrl, content};
}

export async function ensureSourceLoaded(): Promise<void> {
    const isContentStale =
        !state.lastLoadedAt || Date.now() - state.lastLoadedAt > REFRESH_INTERVAL_MS;

    if (!state.sections.length || isContentStale) {
        const {url, content} = await fetchSource();

        parseContent(content, url);

        state.lastLoadedAt = Date.now();
    }
}
