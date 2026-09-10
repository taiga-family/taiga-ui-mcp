import {clearScreenDown, cursorTo, emitKeypressEvents, moveCursor} from 'node:readline';
import {createInterface} from 'node:readline/promises';
import {type Readable, type Writable} from 'node:stream';

interface InteractiveInput extends Readable {
    isTTY?: boolean;
    setRawMode?(mode: boolean): void;
}

interface InteractiveOutput extends Writable {
    isTTY?: boolean;
}

export interface PromptIo {
    readonly input: InteractiveInput;
    readonly output: InteractiveOutput;
}

interface Key {
    readonly name?: string;
    readonly ctrl?: boolean;
}

const HIDE_CURSOR = '[?25l';
const SHOW_CURSOR = '[?25h';

function processIo(): PromptIo {
    return {input: process.stdin, output: process.stdout};
}

export function isInteractive(): boolean {
    // isTTY is `true` on a terminal and `undefined` (falsy) otherwise.
    return process.stdin.isTTY;
}

export async function promptSelect(
    title: string,
    labels: readonly string[],
    defaultIndex = 0,
    io: PromptIo = processIo(),
): Promise<number> {
    const [index] = await interactiveMenu(title, labels, false, defaultIndex, io);

    return index ?? defaultIndex;
}

export async function promptMultiSelect(
    title: string,
    labels: readonly string[],
    io: PromptIo = processIo(),
): Promise<readonly number[]> {
    return interactiveMenu(title, labels, true, 0, io);
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

async function interactiveMenu(
    title: string,
    labels: readonly string[],
    multiple: boolean,
    initialCursor: number,
    io: PromptIo,
): Promise<number[]> {
    const {input, output} = io;

    const paint =
        output.isTTY === true ? color : (_code: string, text: string): string => text;

    const selected = new Set<number>();
    let cursor = Math.min(Math.max(initialCursor, 0), labels.length - 1);

    emitKeypressEvents(input);

    const rawCapable = input.isTTY === true && typeof input.setRawMode === 'function';

    if (rawCapable) {
        input.setRawMode?.(true);
    }

    const hint = multiple
        ? '↑/↓ move · space toggle · enter confirm'
        : '↑/↓ move · enter select';

    const draw = (): void => {
        const rows = labels.map((label, index) => {
            const active = index === cursor;
            const pointer = active ? paint('36', '❯') : ' ';

            const box = multiple
                ? `${selected.has(index) ? paint('32', '[·]') : '[ ]'} `
                : '';

            const text = active ? paint('1;36', label) : label;

            return `${pointer} ${box}${text}`;
        });

        output.write(`${title} ${paint('2', `(${hint})`)}\n${rows.join('\n')}\n`);
    };

    const clear = (): void => {
        moveCursor(output, 0, -(labels.length + 1));
        cursorTo(output, 0);
        clearScreenDown(output);
    };

    output.write(HIDE_CURSOR);
    draw();

    return new Promise<number[]>((resolve, reject) => {
        function onKeypress(_str: string, key: Key): void {
            if (key.ctrl && key.name === 'c') {
                finish(null);

                return;
            }

            switch (key.name) {
                case 'down':
                case 'j':
                    cursor = (cursor + 1) % labels.length;
                    redraw();
                    break;
                case 'enter':
                case 'return':
                    confirm();
                    break;
                case 'k':
                case 'up':
                    cursor = (cursor - 1 + labels.length) % labels.length;
                    redraw();
                    break;
                case 'space':
                    if (multiple) {
                        toggle();
                        redraw();
                    }

                    break;
                default:
                    break;
            }
        }

        function toggle(): void {
            if (selected.has(cursor)) {
                selected.delete(cursor);
            } else {
                selected.add(cursor);
            }
        }

        function confirm(): void {
            if (multiple && selected.size === 0) {
                selected.add(cursor);
            }

            finish(multiple ? [...selected].sort((a, b) => a - b) : [cursor]);
        }

        function redraw(): void {
            clear();
            draw();
        }

        function finish(result: number[] | null): void {
            input.off('keypress', onKeypress);

            if (rawCapable) {
                input.setRawMode?.(false);
            }

            output.write(`${SHOW_CURSOR}\n`);
            input.pause();

            if (result) {
                resolve(result);
            } else {
                reject(new Error('Cancelled.'));
            }
        }

        input.on('keypress', onKeypress);
        input.resume();
    });
}

function color(code: string, text: string): string {
    return `[${code}m${text}[0m`;
}
