import {createInterface} from 'node:readline/promises';
import {type Readable, type Writable} from 'node:stream';

export interface PromptIo {
    readonly input: Readable;
    readonly output: Writable;
}

function processIo(): PromptIo {
    return {input: process.stdin, output: process.stdout};
}

export function isInteractive(): boolean {
    // isTTY is `true` on a terminal and `undefined` (falsy) otherwise.
    return process.stdin.isTTY;
}

// Returns the chosen 0-based index, the default on empty input, or null when invalid.
export function parseMenuChoice(
    answer: string,
    count: number,
    defaultIndex?: number,
): number | null {
    const trimmed = answer.trim();

    if (!trimmed && defaultIndex !== undefined) {
        return defaultIndex;
    }

    const choice = Number(trimmed);

    return Number.isInteger(choice) && choice >= 1 && choice <= count ? choice - 1 : null;
}

export async function promptMenu(
    title: string,
    labels: readonly string[],
    defaultIndex?: number,
    io: PromptIo = processIo(),
): Promise<number> {
    const rl = createInterface({input: io.input, output: io.output});
    const menu = labels.map((label, index) => `  ${index + 1}) ${label}`).join('\n');
    const hint = defaultIndex === undefined ? '' : ` [${defaultIndex + 1}]`;

    try {
        let choice: number | null = null;

        while (choice === null) {
            const answer = await rl.question(`${title}\n${menu}\n>${hint} `);

            choice = parseMenuChoice(answer, labels.length, defaultIndex);

            if (choice === null) {
                io.output.write('Please enter a number from the list.\n');
            }
        }

        return choice;
    } finally {
        rl.close();
    }
}

export async function promptText(
    question: string,
    io: PromptIo = processIo(),
): Promise<string> {
    const rl = createInterface({input: io.input, output: io.output});

    try {
        return (await rl.question(`${question} `)).trim();
    } finally {
        rl.close();
    }
}
