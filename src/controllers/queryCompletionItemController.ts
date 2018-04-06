'use strict'

import * as vscode from 'vscode';
import * as constant from '../constant';

import { QueryController } from './queryController';
import { ElasticsearchQueryDocument} from '../parsers/elasticSearchQueryDocument';
import { ElasticsearchQuery } from '../models/elasticSearchQuery';
import { TextToken } from '../models/textToken';
import { ServiceSpecificationManager } from '../managers/serviceSpecificationManager';
import { SpecificationItem } from '../models/specificationItem';
import { TokenType } from '../parsers/elasticsearchQueryDocumentScanner';

export class QueryCompletionItemController extends QueryController 
    implements vscode.CompletionItemProvider {

    public registerCommands() {
        vscode.languages.registerCompletionItemProvider(constant.ElasticsearchQueryDocumentSelector, this, '/');
    }

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        
        let completionItems:vscode.CompletionItem[] = []
        let query = this.getQueryWithPosition(position, document);

        if(query) {
            let offset = document.offsetAt(position);
            let tokenType = query.tokenTypeAt(offset);
            let suggestions:any[] = [];

            if(tokenType === TokenType.Command) {
                suggestions = this.getSuggestions(query);
            }

            for(let suggestion of suggestions) {
                let completionItem = this.createCompletionItemWith(suggestion, query);
                
                if(completionItem) {
                    completionItems.push(completionItem);
                }
                
            }

        }

        return completionItems;
    }
    
    public resolveCompletionItem?(item: vscode.CompletionItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem> {
        return null;
    }

    private getSuggestions(query:ElasticsearchQuery):SpecificationItem[] {
        return ServiceSpecificationManager.get().getSuggestionsWithMethod(query.method, query.command);
    }

    private getQueryWithPosition(position: vscode.Position, textDocument: vscode.TextDocument): ElasticsearchQuery {

        let text = textDocument.getText();
        let offset = textDocument.offsetAt(position);
        let query = ElasticsearchQueryDocument.getQueryWithOffset(offset, text);

        return query;
    }

    private createCompletionItemWith(specificationItem:any, query:ElasticsearchQuery): vscode.CompletionItem {

        let value = specificationItem.value.substring(1);
        let completionItem:vscode.CompletionItem = null;

        if(value) {

            completionItem = new vscode.CompletionItem(
                value,
                    vscode.CompletionItemKind.Function
                );
    
            if(!specificationItem.isEndpoint) {
                completionItem.kind = vscode.CompletionItemKind.Field
            }
    
            let matches = value.match(/\{(\w+)\}/g);
    
            if(matches) {
    
                let index = 1;
                let snippet = value;
    
                for(let m of matches) {
                    let key = m.substring(1, m.length - 1);
                    snippet = snippet.replace(m, '${' + index + ':' + key + '}');
                    index++;
                }
    
                let snippetString:vscode.SnippetString = new vscode.SnippetString(snippet);
                completionItem.insertText = snippetString;
            }

        }

        return completionItem;
    }

}