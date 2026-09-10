#!/usr/bin/env node
import {logError} from './utils/logger.js';

async function main(): Promise<void> {
    if (process.argv[2] === 'init') {
        const {runInit} = await import('./cli/init.js');

        await runInit(process.argv.slice(3));

        return;
    }

    const {start} = await import('./server/server.js');

    await start();
}

main().catch((err: unknown) => {
    logError('Unhandled startup error', err);

    process.exit(1);
});
