#!/usr/bin/env node
import {start} from './server/server.js';
import {logError} from './utils/logger.js';

start().catch((err: unknown) => {
    logError('Unhandled startup error', err);

    process.exit(1);
});
