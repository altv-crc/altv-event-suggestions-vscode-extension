import * as vscode from 'vscode';
import { getParamCompletions } from './fileHelper';

const CompletionActivators = {
    COMMA: ',',
};

export function startEventParamsSuggestions(): vscode.Disposable {
    return vscode.languages.registerCompletionItemProvider(
        ['javascript', 'typescript', 'html', 'jsx', 'tsx', 'vue', 'svelte'],
        {
            provideCompletionItems(document, position, context, token) {
                const line = document.lineAt(position).text.substring(0, position.character);
                return getParamCompletions(line);
            },
        },
        CompletionActivators.COMMA
    );
}
