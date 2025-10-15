import { state } from './server.js';
import { parseContent } from '../utils/parse-content.js';
import { fetchWithCache } from './cache.js';

export async function fetchSource(): Promise<{
    url: string;
    content: string;
    cacheFilePath: string;
    hash: string;
}> {
    const argProvidedUrl = process.argv
        .find((arg) => arg.startsWith('--source-url='))
        ?.split('=')[1];

    const sourceUrl = argProvidedUrl || process.env.SOURCE_URL;

    if (!sourceUrl) {
        throw new Error(
            'Source URL not provided. Set SOURCE_URL or pass --source-url=...'
        );
    }

    try {
        const { content, cacheFilePath, hash } = await fetchWithCache(
            sourceUrl
        );

        return { url: sourceUrl, content, cacheFilePath, hash };
    } catch (err: any) {
        const reason = err?.message || String(err);

        throw new Error(`Unable to load documentation source: ${reason}`);
    }
}

export async function ensureSourceLoaded(): Promise<void> {
    if (state.sections.length > 0) return;

    const { url, content, cacheFilePath, hash } = await fetchSource();

    state.cacheFilePath = cacheFilePath;
    state.hash = hash;

    parseContent(content, url);
}
