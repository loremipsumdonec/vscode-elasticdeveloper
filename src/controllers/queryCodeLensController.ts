'use strict'

import * as vscode from 'vscode';
import * as constant from '../constant';

import { QueryController } from './queryController';
import { ElasticsearchQueryDocument} from '../parsers/elasticSearchQueryDocument';

export class QueryCodeLensController extends QueryController 
    implements vscode.CodeLensProvider {

    onDidChangeCodeLenses?: vscode.Event<void>;
    
    public registerCommands() {

        this.registerCommand(constant.ElasticsearchQueryCodeLensCommandRunQuery, 
            (query, configuration) => { this.runQuery(query, configuration) });

        this.registerCommand(constant.ElasticsearchQueryCodeLensCommandRunAllQueries, 
            (queries, configuration) => { this.runAllQueries(queries, configuration)});

        this.registerCodeLensProvider(constant.ElasticsearchQueryDocumentSelector, this);
    }

    public provideCodeLenses(textDocument: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
        
        const runQueryCommand = this.getCommand(constant.ElasticsearchQueryCodeLensCommandRunQuery);
        const runAllQueriesCommand = this.getCommand(constant.ElasticsearchQueryCodeLensCommandRunAllQueries);

        var codeLenses = [];
        
        let text = textDocument.getText();
        let document = ElasticsearchQueryDocument.parse(text);        
        let configuration = null;

        if(document.hasConfigurations && document.hasQueries) {
            configuration = document.configurations[0];
            configuration.source = textDocument.uri.fsPath;
            
            let range = this.getRangeWithin(textDocument, configuration.textTokens[0]);

            let runAllQueryCodeLens = new vscode.CodeLens(range, {
                title: 'run all queries',
                command: runAllQueriesCommand,
                arguments: [document.queries, configuration]
            });

            codeLenses.push(runAllQueryCodeLens);
        }

        for(let query of document.queries) {
            
            let range = this.getRangeWithin(textDocument, query.textTokens[0]);

            let codeLensTitle = 'run query';

            if(query.isBulk) {
                codeLensTitle = 'run bulk query (size: '+ query.bulk.length +')'
            }

            codeLensTitle += '(hasValidBody = '+ query.hasValidBody +')';

            let runQueryCodeLens = new vscode.CodeLens(range, {
                title: codeLensTitle,
                command: runQueryCommand,
                arguments: [query, configuration]
            });

            codeLenses.push(runQueryCodeLens);

            if(query.hasName) {
                
                let codeLens = new vscode.CodeLens(range, {
                    title: query.name,
                    command: ''
                });
    
                codeLenses.push(codeLens);
            }

        }
        
        return codeLenses;

    }
    
    public resolveCodeLens?(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {
        return null;
    }
}