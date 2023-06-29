import * as vscode from 'vscode';
import { getVariableValue } from './variableHelper';

interface EventProps {
    isToClient?: boolean;
    isToServer?: boolean;
    isServerOnly?: boolean;
    isClientOnly?: boolean;
    isToWebView?: boolean;
    isFromWebView?: boolean;
}

interface EventName {
    eventName: string;
    eventSuggestion: string | undefined;
    variableName?: string;
    props: EventProps;
}

export type EventPropNames = keyof EventProps;

const supportedExtensions = ['tsx', 'jsx', 'ts', 'js', 'html', 'svelte'];
const previousFileVersion: { [uri: string]: number } = {};
const availableEmits: { [uri: string]: EventName[] } = {};
let interval: NodeJS.Timer;
let isUpdating = false;

export async function getFileList(): Promise<vscode.Uri[]> {
    let fileUris: vscode.Uri[] = [];
    for (let ext of supportedExtensions) {
        const results = await vscode.workspace.findFiles(`**/*.${ext}`, '**/node_modules/**');
        fileUris = fileUris.concat(results);
    }

    return fileUris;
}

function getProps(line: string, uri: string, isLikelyWebview = false): EventProps {
    const isServer = uri.includes('server');
    const isClient = uri.includes('client');

    if (line.includes('emitServer')) {
        return { isToServer: true };
    }

    if (isServer && line.includes('alt.emitClient')) {
        return { isToClient: true };
    }

    if (isServer && line.includes('alt.emit')) {
        return { isServerOnly: true };
    }

    if (isClient && line.includes('alt.emit') && isLikelyWebview) {
        return { isFromWebView: true };
    }

    if (isClient && line.includes('emit') && !line.includes('alt')) {
        return { isToWebView: true };
    }

    if (isClient && line.includes('alt.emit')) {
        return { isClientOnly: true };
    }

    if (line.includes('emit') && !line.includes('alt.emit') && isServer) {
        return { isToClient: true };
    }

    // Assuming this is webview at this point; that's all it can be
    return {};
}

function cleanLine(line: string) {
    line = line.trim();
    line = line.replace(/\/\/.*/g, ''); // Removes trailing comments
    line = line.replace(';', ''); // Removes any semicolons
    return line;
}

/**
 * Extracts like so:
 *
 * player.emit('hello-world') -> "'hello-world'"
 * alt.emitServer(functionNames.name1) -> "functionNames.name1"
 *
 * @param {string} line
 * @return {*}
 */
function extractEmit(line: string) {
    if (line.includes('emitClient')) {
        line = line.replace(/^([^,]+),/g, ''); // Removes everything up to first comma + player argument
    } else {
        line = line.replace(/.*\(/g, ''); // Removes everything up to first (
    }

    line = line.replace(/(,|\)).*/g, ''); // Removes trailing ), or ,
    return line.trim();
}

/**
 * Does some general checks to see if the parsed line has emit in the name
 *
 * @param {string} line
 * @return {*}
 */
function isValidEmit(line: string) {
    if (!line) {
        return false;
    }

    if (!line.includes('emit')) {
        return false;
    }

    if (line.startsWith('//') || line.startsWith('*')) {
        return false;
    }

    if (line.includes('onServer') || line.includes('onClient')) {
        return false;
    }

    return true;
}

async function updateEmitsFromFile(file: vscode.Uri) {
    const data = await vscode.workspace.fs.readFile(file);
    const content = data.toString();
    const stat = await vscode.workspace.fs.stat(file);
    const filePath = String(file.fsPath);

    if (previousFileVersion[filePath] && previousFileVersion[filePath] === stat.size) {
        return;
    }

    previousFileVersion[filePath] = stat.size;

    if (availableEmits[filePath]) {
        availableEmits[filePath] = [];
    }

    const lines = content.split('\n');
    let isLikelyWebview = false;

    let previousLine;
    for (let line of lines) {
        if (line.includes(`'alt' in window`)) {
            isLikelyWebview = true;
            continue;
        }

        if (line.includes('<script>')) {
            isLikelyWebview = true;
            continue;
        }

        if (line.includes('<html>')) {
            isLikelyWebview = true;
            continue;
        }

        const uncleanLine = line;

        if (!previousLine) {
            previousLine = uncleanLine;
        }

        line = cleanLine(line);
        if (!isValidEmit(line)) {
            previousLine = uncleanLine;
            continue;
        }

        let emitEvent = extractEmit(line);
        const quotesToCheck = [`'`, `"`, '`'];
        let isString = false;
        for (let quote of quotesToCheck) {
            if (emitEvent.includes(quote)) {
                while (emitEvent.includes(quote)) {
                    emitEvent = emitEvent.replace(quote, '');
                }

                isString = true;
                break;
            }
        }

        const eventName = emitEvent;
        const props = getProps(line, file.fsPath, isLikelyWebview);

        let eventSuggestion: string | undefined = undefined;
        if (previousLine.includes('//')) {
            eventSuggestion = previousLine
                .replace('//', '')
                .replace(/\r?\n|\r/g, '')
                .trimStart();
        }

        if (!availableEmits[filePath]) {
            availableEmits[filePath] = [];
        }

        // Direct string variable, nothing else to think about.
        if (isString) {
            availableEmits[filePath].push({ eventName, eventSuggestion, props });
            previousLine = uncleanLine;
            continue;
        }

        // Process variable name and try to obtain value. Otherwise ignore.
        const value = getVariableValue(eventName);
        if (!value) {
            previousLine = uncleanLine;
            return;
        }

        availableEmits[filePath].push({ eventName: value, variableName: eventName, eventSuggestion, props });
    }

    if (!availableEmits[filePath]) {
        return;
    }
}

export async function update() {
    if (isUpdating) {
        return;
    }

    isUpdating = true;

    const files = await getFileList();
    for (let file of files) {
        updateEmitsFromFile(file);
    }

    isUpdating = false;
}

export function getEmitCompletions(propName: keyof EventProps): vscode.CompletionItem[] {
    const keys = Object.keys(availableEmits);
    const validEmits: vscode.CompletionItem[] = [];

    for (let key of keys) {
        const emitsFromFile = availableEmits[key];
        for (let emit of emitsFromFile) {
            if (!emit.props[propName]) {
                continue;
            }

            validEmits.push(new vscode.CompletionItem(emit.eventName, vscode.CompletionItemKind.Event));
        }
    }

    return validEmits;
}

export function getParamCompletions(line: string): vscode.CompletionItem[] {
    const keys = Object.keys(availableEmits);
    const validCompletions: vscode.CompletionItem[] = [];

    for (let key of keys) {
        const emitsFromFile = availableEmits[key];
        for (let emit of emitsFromFile) {
            if (!emit.eventSuggestion) {
                continue;
            }

            if (emit.variableName && line.includes(emit.variableName)) {
                const eventName = emit.variableName;
                const item = new vscode.CompletionItem(
                    `(${emit.eventSuggestion}) => {}`,
                    vscode.CompletionItemKind.Method
                );
                item.detail = `Use Parameters from Event: ${eventName}`;
                item.insertText = `(${emit.eventSuggestion}) => {}`;
                validCompletions.push(item);
                continue;
            }

            if (line.includes(emit.eventName)) {
                const eventName = emit.eventName;
                const item = new vscode.CompletionItem(
                    `(${emit.eventSuggestion}) => {}`,
                    vscode.CompletionItemKind.Method
                );
                item.detail = `Use Parameters from Event: ${eventName}`;
                item.insertText = `(${emit.eventSuggestion}) => {}`;
                validCompletions.push(item);
                continue;
            }
        }
    }

    return validCompletions;
}

export function initFileHelper() {
    interval = setInterval(update, 1000);
    update();
}

export function clearFileHelper() {
    clearInterval(interval);
}
