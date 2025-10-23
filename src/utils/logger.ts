export function logError(message: string, err: unknown): void {
    const stack = err instanceof Error ? (err.stack ?? err.message) : String(err);

    console.error(`[ERROR] ${message}: ${stack}`);
}

export function logInfo(message: string): void {
    console.error(`[INFO] ${message}`);
}
