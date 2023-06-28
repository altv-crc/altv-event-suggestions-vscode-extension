import * as vscode from 'vscode';
import { convertToParamCompletions, getSuggestions } from './suggestions';

const CompletionActivators = {
    COMMA: ',',
};

export function startEventParamsSuggestions(): vscode.Disposable {
    return vscode.languages.registerCompletionItemProvider(
        ['javascript', 'typescript'],
        {
            provideCompletionItems(document, position, context, token) {
                const suggestions = getSuggestions();
                const line = document.lineAt(position).text.substring(0, position.character);
                return convertToParamCompletions(line, suggestions);
            },
        },
        CompletionActivators.COMMA
    );
}
