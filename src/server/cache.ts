import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export interface CacheMeta {
    sourceUrl: string;
    etag?: string;
}

export interface FetchResult {
    url: string;
    content: string;
    cacheFilePath: string;
    hash: string;
    meta?: CacheMeta;
}

const META_FILENAME = 'meta.json';

// macOS: ~/Library/Caches/taiga-ui-mcp
// Linux/Unix: ~/.cache/taiga-ui-mcp
// Windows: %LOCALAPPDATA%/taiga-ui-mcp/Cache
// Fallback: os.tmpdir()/taiga-ui-mcp-cache
function getStandardCacheDir(): string {
    const home = os.homedir();
    const platform = process.platform;

    if (platform === 'darwin' && home) {
        return path.join(home, 'Library', 'Caches', 'taiga-ui-mcp');
    }

    if (platform === 'win32') {
        const localAppData = process.env.LOCALAPPDATA;

        if (localAppData)
            return path.join(localAppData, 'taiga-ui-mcp', 'Cache');

        if (home)
            return path.join(home, 'AppData', 'Local', 'taiga-ui-mcp', 'Cache');
    }

    // Linux / other Unix
    if (home && home !== '/') {
        return path.join(home, '.cache', 'taiga-ui-mcp');
    }

    return path.join(os.tmpdir(), 'taiga-ui-mcp-cache');
}

export async function ensureCacheDir(): Promise<string> {
    const dir = getStandardCacheDir();

    await fs.mkdir(dir, { recursive: true });

    return dir;
}

export async function readCacheMeta(
    cacheDir: string
): Promise<CacheMeta | null> {
    try {
        const raw = await fs.readFile(
            path.join(cacheDir, META_FILENAME),
            'utf8'
        );
        return JSON.parse(raw) as CacheMeta;
    } catch {
        return null;
    }
}

async function findCachedHash(cacheDir: string): Promise<string | null> {
    try {
        const txtFiles = (await fs.readdir(cacheDir)).filter((f) =>
            f.endsWith('.txt')
        );

        return txtFiles.length === 0 ? null : txtFiles[0].slice(0, -4); // remove .txt extension
    } catch {
        return null;
    }
}

export async function fetchWithCache(url: string): Promise<FetchResult> {
    const cacheDir = await ensureCacheDir();
    const existingMeta = await readCacheMeta(cacheDir);
    const cachedHash = await findCachedHash(cacheDir);

    const validCache =
        existingMeta && cachedHash && existingMeta.sourceUrl === url
            ? existingMeta
            : null;

    let response: Response;

    try {
        response = await fetch(url, {
            headers: validCache?.etag
                ? { 'If-None-Match': validCache.etag }
                : undefined,
        });
    } catch (e: any) {
        if (validCache && cachedHash) {
            const cacheFilePath = path.join(
                await ensureCacheDir(),
                `${cachedHash}.txt`
            );

            try {
                const content = await fs.readFile(cacheFilePath, 'utf8');

                return {
                    url,
                    content,
                    cacheFilePath,
                    hash: cachedHash,
                    meta: validCache,
                };
            } catch {}
        }
        throw new Error(
            `Network error fetching documentation: ${e?.message || e}`
        );
    }

    if (response.status === 304 && validCache && cachedHash) {
        const cacheFilePath = path.join(cacheDir, `${cachedHash}.txt`);

        try {
            const content = await fs.readFile(cacheFilePath, 'utf8');
            return {
                url,
                content,
                cacheFilePath,
                hash: cachedHash,
                meta: validCache,
            };
        } catch {
            // Cache file missing despite 304 - fall through to fetch fresh content
            // This handles the case where .txt files were manually deleted but meta.json remains
        }
    }

    if (!response.ok) {
        throw new Error(
            `Failed to fetch documentation (HTTP ${response.status} ${response.statusText}) from ${url}`
        );
    }

    const content = await response.text();

    if (!content.trim()) {
        throw new Error(`Fetched documentation from ${url} is empty.`);
    }

    const newHash = createHash('sha256').update(content).digest('hex');
    const etag = response.headers.get('etag') || undefined;

    // If existing meta present AND hash unchanged, treat as not modified logically
    if (validCache && cachedHash === newHash) {
        const cacheFilePath = path.join(cacheDir, `${cachedHash}.txt`);
        const contentToUse = await fs
            .readFile(cacheFilePath, 'utf8')
            .catch(() => content);

        return {
            url,
            content: contentToUse,
            cacheFilePath,
            hash: cachedHash,
            meta: validCache,
        };
    }

    const cacheFilePath = path.join(cacheDir, `${newHash}.txt`);
    await fs.writeFile(cacheFilePath, content, 'utf8');

    const meta: CacheMeta = { sourceUrl: url, etag };
    await fs.writeFile(
        path.join(cacheDir, META_FILENAME),
        JSON.stringify(meta, null, 2),
        'utf8'
    );

    return { url, content, cacheFilePath, hash: newHash, meta };
}
