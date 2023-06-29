import * as vscode from 'vscode';
import { startEventNameSuggestions } from './eventNameSuggestions';
import { startEventParamsSuggestions } from './eventParamsSuggestions';
import { clearFileHelper, initFileHelper, update } from './fileHelper';
import { clearVariableHelper, initVariableHelper } from './variableHelper';

let context: vscode.ExtensionContext;
let disposables: vscode.Disposable[] = [];

export function activate(ctx: vscode.ExtensionContext) {
    context = ctx;
    disposables.push(startEventNameSuggestions());
    disposables.push(startEventParamsSuggestions());
    initVariableHelper();
    initFileHelper();
}

export function deactivate() {
    for (let disposable of disposables) {
        disposable.dispose();
    }

    disposables = [];

    clearVariableHelper();
    clearFileHelper();
}
