'use strict'

import * as vscode from 'vscode';
import * as constant from '../../../constant';

import { QueryController } from '../../../controllers/queryController';
import { ElasticsearchQueryDocument} from '../../../parsers/elasticSearchQueryDocument';
import { ElasticsearchQuery } from '../../../models/elasticSearchQuery';
import { ElasticsearchQueryCompletionManager } from '../managers/elasticsearchQueryCompletionManager';

export class QueryCompletionItemController extends QueryController 
    implements vscode.CompletionItemProvider {

    public registerCommands() {
        this.registerCompletionItemProvider(constant.ElasticsearchQueryDocumentSelector, this, '=', '/', ':', '\n', '"', '?', '\&');
    }

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        
        let completionItems:vscode.CompletionItem[] = []
        let query = this.getQueryWithPosition(position, document);

        if(query) {

            let triggerCharacter = context.triggerCharacter;
            let offset = document.offsetAt(position);
            let currentLine = document.lineAt(position);

            var manager = ElasticsearchQueryCompletionManager.get();
            completionItems = manager.getCompletionItems(query, offset, triggerCharacter, currentLine);

        }

        return completionItems;
    }
    
    public resolveCompletionItem?(item: vscode.CompletionItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem> {
        return null;
    }

    private getQueryWithPosition(position: vscode.Position, textDocument: vscode.TextDocument): ElasticsearchQuery {

        let text = textDocument.getText();
        let offset = textDocument.offsetAt(position);
        let query = ElasticsearchQueryDocument.getQueryWithOffset(offset, text);

        return query;
    }
}