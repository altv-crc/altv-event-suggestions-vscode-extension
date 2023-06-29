import * as vscode from 'vscode';
import { EventPropNames, getEmitCompletions } from './fileHelper';

const CompletionActivators = {
    SINGLE_QUOTE: `'`,
    DOUBLE_QUOTE: `"`,
    TICK: '`',
};

function getPropName(line: string, uri: string, isLikelyWebview = false): EventPropNames {
    const isServer = uri.includes('server');
    const isClient = uri.includes('client');

    // alt.onServer - but it only on client-side
    if (isClient && line.includes('onServer')) {
        return 'isToClient';
    }

    // alt.onClient
    if (isServer && line.includes('alt.onClient')) {
        return 'isToServer';
    }

    // alt.on - but its server-side
    if (isServer && line.includes('alt.on')) {
        return 'isServerOnly';
    }

    // view.on, webview.on, etc.
    if (isClient && line.includes('on') && !line.includes('alt')) {
        return 'isFromWebView';
    }

    if (isClient && line.includes('alt.on') && isLikelyWebview) {
        return 'isToWebView';
    }

    return 'isClientOnly';
}

export function startEventNameSuggestions(): vscode.Disposable {
    return vscode.languages.registerCompletionItemProvider(
        ['javascript', 'typescript', 'html', 'jsx', 'tsx', 'vue', 'svelte'],
        {
            provideCompletionItems(document, position, context, token) {
                const line = document.lineAt(position).text.substring(0, position.character);
                const text = document.getText();

                let isLikelyWebview = false;
                if (text.includes('in window') || text.includes('<script>') || text.includes('html')) {
                    isLikelyWebview = true;
                }

                const propName = getPropName(line, document.uri.fsPath, isLikelyWebview);
                return getEmitCompletions(propName);
            },
        },
        CompletionActivators.SINGLE_QUOTE,
        CompletionActivators.DOUBLE_QUOTE,
        CompletionActivators.TICK
    );
}
