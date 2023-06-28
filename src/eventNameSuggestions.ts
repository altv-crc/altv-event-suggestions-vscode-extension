import * as vscode from 'vscode';
import { convertToCompletions, getSuggestions } from './suggestions';

const CompletionActivators = {
    SINGLE_QUOTE: `'`,
    DOUBLE_QUOTE: `"`,
    TICK: '`',
};

export function startEventNameSuggestions(): vscode.Disposable {
    return vscode.languages.registerCompletionItemProvider(
        ['javascript', 'typescript'],
        {
            provideCompletionItems(document, position, context, token) {
                const suggestions = getSuggestions();
                const line = document.lineAt(position).text.substring(0, position.character);
                const isServer = document.uri.fsPath.includes('server');

                // alt.on - client / server
                if (line.includes('alt.on') && !line.includes('alt.onClient') && !line.includes('alt.onServer')) {
                    return convertToCompletions(
                        suggestions.filter((x) => {
                            if (isServer) {
                                return x.props.isServerOnly;
                            }

                            return x.props.isClientOnly;
                        })
                    );
                }

                // alt.onClient
                if (line.includes('alt.onServer')) {
                    return convertToCompletions(
                        suggestions.filter((x) => {
                            return x.props.isToClient;
                        })
                    );
                }

                if (line.includes('alt.onClient')) {
                    return convertToCompletions(
                        suggestions.filter((x) => {
                            return x.props.isToServer;
                        })
                    );
                }

                return undefined;
            },
        },
        CompletionActivators.SINGLE_QUOTE,
        CompletionActivators.DOUBLE_QUOTE,
        CompletionActivators.TICK
    );
}
