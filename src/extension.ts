import * as vscode from 'vscode';
import { startEventNameSuggestions } from './eventNameSuggestions';
import { startSuggestions, stopSuggestions } from './suggestions';
import { startEventParamsSuggestions } from './eventParamsSuggestions';

let context: vscode.ExtensionContext;
let disposables: vscode.Disposable[] = [];

export function activate(ctx: vscode.ExtensionContext) {
    context = ctx;
    disposables.push(startEventNameSuggestions());
    disposables.push(startEventParamsSuggestions());
    startSuggestions();
}

export function deactivate() {
    for (let disposable of disposables) {
        disposable.dispose();
    }

    disposables = [];
    stopSuggestions();
}
