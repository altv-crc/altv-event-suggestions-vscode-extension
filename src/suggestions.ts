import * as vscode from 'vscode';

let isUpdating = false;
let suggestions: EventName[] = [];
let interval: NodeJS.Timer;

interface EventName {
    eventName: string;
    eventSuggestion: string | undefined;
    props: {
        isToClient?: boolean;
        isToServer?: boolean;
        isServerOnly?: boolean;
        isClientOnly?: boolean;
    };
}

function extractEmit(someString: string): string | undefined {
    if (!someString.match(/.*emit.*\((.*?)['"`]/g)) {
        console.log(`This was undefined: ${someString}`);
        return undefined;
    }

    if (someString.includes('//')) {
        return undefined;
    }

    const data = someString.replace(/.*emit.*\((.*?)['"`]/g, '');
    const splitData = data.split(/['"`]/g);
    return splitData.shift()?.replace(/\s/g, '');
}

async function updateFiles() {
    if (isUpdating) {
        return;
    }

    isUpdating = true;
    const tsFiles = await vscode.workspace.findFiles('**/*.ts', `**/node_modules/**/*`);
    const jsFiles = await vscode.workspace.findFiles('**/*.js', `**/node_modules/**/*`);
    const files = [...tsFiles, ...jsFiles];

    const foundEvents: { [key: string]: boolean } = {};
    const newSuggestions: EventName[] = [];

    for (let filePath of files) {
        const contentArray = await vscode.workspace.fs.readFile(filePath);
        const content = contentArray.toString();
        const lines = content.split('\n');
        let previousLine: string | undefined = undefined;

        for (let line of lines) {
            if (!line.includes('emit')) {
                previousLine = line;
                continue;
            }

            const eventName = extractEmit(line);
            if (!eventName) {
                previousLine = line;
                continue;
            }

            if (foundEvents[eventName]) {
                previousLine = line;
                continue;
            }

            foundEvents[eventName] = true;

            let eventSuggestion: string | undefined;
            if (previousLine && previousLine.includes('//')) {
                eventSuggestion = previousLine
                    .replace('//', '')
                    .replace(/\r?\n|\r/g, '')
                    .trimStart();
            }

            // Client to Server
            if (line.includes('emitServer')) {
                newSuggestions.push({ eventName, props: { isToServer: true }, eventSuggestion });
                previousLine = line;
                continue;
            }

            // Server to Client
            if (line.includes('emitClient')) {
                newSuggestions.push({ eventName, props: { isToClient: true }, eventSuggestion });
                previousLine = line;
                continue;
            }

            // Player Class to Client
            if (line.includes('emit') && !line.includes('alt')) {
                newSuggestions.push({ eventName, props: { isToClient: true }, eventSuggestion });
                previousLine = line;
                continue;
            }

            if (!line.includes('emit')) {
                previousLine = line;
                continue;
            }

            // Resource to Resource
            const isServer = filePath.fsPath.includes('server');
            newSuggestions.push({
                eventName,
                props: isServer ? { isServerOnly: true } : { isClientOnly: true },
                eventSuggestion,
            });
            previousLine = line;
        }
    }

    suggestions = newSuggestions;
    isUpdating = false;
}

export function startSuggestions() {
    interval = setInterval(updateFiles, 2500);
    updateFiles();
}

export function stopSuggestions() {
    try {
        clearInterval(interval);
    } catch (err) {}
}

export function getSuggestions(): EventName[] {
    return suggestions;
}

export function convertToCompletions(suggestions: EventName[]): vscode.CompletionItem[] {
    return suggestions.map((x) => {
        return new vscode.CompletionItem(x.eventName, vscode.CompletionItemKind.Event);
    });
}

export function convertToParamCompletions(line: string, suggestions: EventName[]): vscode.CompletionItem[] {
    const validParamSuggestions = suggestions.filter((x) => x.eventSuggestion && line.includes(x.eventName));
    return validParamSuggestions.map((x) => {
        const item = new vscode.CompletionItem(`(${x.eventSuggestion}) => {}`, vscode.CompletionItemKind.Method);
        item.detail = `Use Parameters from Event: ${x.eventName}`;
        item.insertText = `(${x.eventSuggestion})}) => {}`;
        return item;
    });
}
