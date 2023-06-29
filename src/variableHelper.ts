import * as vscode from 'vscode';

const previousFileVersion: { [uri: string]: number } = {};
const variableMapping: { [key: string]: string } = {};
let isUpdating = false;
let interval: NodeJS.Timer;

function variableToKeyValue(
    variable: string,
    splitter = ':',
    symbolName: string | undefined = undefined
): { key: string; value: string } {
    const [key, value] = variable.replace(/'/gm, '').replace(/ /gm, '').split(splitter);
    return { key: symbolName ? `${symbolName}.${key}` : key, value };
}

function getAllVariableDefs(
    previousName: string,
    document: vscode.TextDocument,
    symbols: vscode.DocumentSymbol[]
): { key: string; value: string }[] | undefined {
    let defs: { key: string; value: string }[] = [];

    for (const symbol of symbols) {
        if (symbol.children && symbol.children.length >= 1) {
            const results = getAllVariableDefs(`${previousName}.${symbol.name}`, document, symbol.children);
            if (!results) {
                continue;
            }

            defs = defs.concat(results);
            continue;
        }

        const text = document.getText(symbol.range);
        if (!text.includes("'")) {
            continue;
        }

        defs.push(variableToKeyValue(text, ':', previousName));
    }

    return defs;
}

async function update() {
    if (isUpdating) {
        return;
    }

    isUpdating = true;

    const files = await vscode.workspace.findFiles('**/server/index.ts', '**/node_modules/**');
    for (let file of files) {
        const stat = await vscode.workspace.fs.stat(file);
        const filePath = String(file.fsPath);

        if (previousFileVersion[filePath] && previousFileVersion[filePath] === stat.size) {
            continue;
        }

        const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            'vscode.executeDocumentSymbolProvider',
            file
        );

        if (!symbols) {
            continue;
        }

        previousFileVersion[filePath] = stat.size;
        if (symbols.length <= 0) {
            continue;
        }

        let definitions: { key: string; value: string }[] = [];
        const document = await vscode.workspace.openTextDocument(file);
        for (let symbolDef of symbols) {
            if (!symbolDef.children || symbolDef.children.length <= 0) {
                const result = variableToKeyValue(document.getText(symbolDef.range), '=');
                if (!result) {
                    continue;
                }

                definitions.push(result);
                continue;
            }

            const defs = getAllVariableDefs(symbolDef.name, document, symbolDef.children);
            if (!defs) {
                continue;
            }

            definitions = definitions.concat(defs);
        }

        for (let def of definitions) {
            variableMapping[def.key] = def.value;
        }
    }

    isUpdating = false;
}

export function getVariableValue(variableKey: string): string | undefined {
    return variableMapping[variableKey];
}

export function initVariableHelper() {
    interval = setInterval(update, 2000);
    update();
}

export function clearVariableHelper() {
    clearInterval(interval);
}
