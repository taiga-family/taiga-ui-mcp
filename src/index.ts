#!/usr/bin/env node
import {logError} from './utils/logger.js';

async function main(): Promise<void> {
    if (process.argv[2] === 'init') {
        const {runInit} = await import('./cli/init.js');

        try {
            await runInit(process.argv.slice(3));
        } catch (error) {
            process.stderr.write(
                `init failed: ${error instanceof Error ? error.message : String(error)}\n`,
            );
            process.exit(1);
        }

        return;
    }

    if (process.argv[2] === 'remove') {
        const {runRemove} = await import('./cli/remove.js');

        try {
            await runRemove(process.argv.slice(3));
        } catch (error) {
            process.stderr.write(
                `remove failed: ${error instanceof Error ? error.message : String(error)}\n`,
            );
            process.exit(1);
        }

        return;
    }

    const {start} = await import('./server/server.js');

    await start();
}

main().catch((err: unknown) => {
    logError('Unhandled startup error', err);

    process.exit(1);
});
