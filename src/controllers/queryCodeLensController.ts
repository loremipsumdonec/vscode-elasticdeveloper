'use strict'

import * as vscode from 'vscode';
import * as constant from '../constant';

import { QueryController } from './queryController';
import { ElasticsearchQueryDocument} from '../parsers/elasticSearchQueryDocument';
import { ElasticsearchQueryCompletionManager } from '../feature/intelliSense/managers/elasticsearchQueryCompletionManager';
import { ElasticsearchQuery } from '../models/elasticSearchQuery';

export class QueryCodeLensController extends QueryController 
    implements vscode.CodeLensProvider {

    private _codeLensProviders:any[];

    onDidChangeCodeLenses?: vscode.Event<void>;
    
    public registerCommands() {

        this.registerCommand(constant.ElasticsearchQueryCodeLensCommandRunQuery, 
            (query, configuration) => { this.runQuery(query, configuration) });

        this.registerCommand(constant.ElasticsearchQueryCodeLensCommandRunAllQueries, 
            (queries, configuration) => { this.runAllQueries(queries, configuration)});

        this.registerCodeLensProvider(constant.ElasticsearchQueryDocumentSelector, this);
    }

    public registerProvider(provider:(query:ElasticsearchQuery, range:vscode.Range) => vscode.CodeLens) {
        this._codeLensProviders.push(provider);
    }

    public provideCodeLenses(textDocument: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
        
        var codeLenses = [];
        
        let text = textDocument.getText();
        let document = ElasticsearchQueryDocument.parse(text);        
        let configuration = null;

        let configurationCodeLensProvider:((configuration:any, document:ElasticsearchQueryDocument, range:vscode.Range) => vscode.CodeLens)[] = []
        configurationCodeLensProvider.push(this.createConfigurationRunAllCodeLens);

        if(document.hasConfigurations) {
            configuration = document.configurations[0];
            configuration.source = textDocument.uri.fsPath;
            let range = this.getRangeWithin(textDocument, configuration.textTokens[0]);

            for(let provider of configurationCodeLensProvider) {
                let codeLens = provider.call(this, configuration,document, range);
            
                if(codeLens) {
                    codeLenses.push(codeLens);
                }
            }
        }

        let queryCodeLensProviders:((query:ElasticsearchQuery, configuration:any, range:vscode.Range) => vscode.CodeLens)[] = []
        queryCodeLensProviders.push(this.createRunQueryCodeLens);
        queryCodeLensProviders.push(this.createHasNameCodeLens);
        queryCodeLensProviders.push(this.createOpenEndpointDocumentationCodeLens);
        
        /*
        queryCodeLensProviders.push(this.createShowUrlCodeLens);
        queryCodeLensProviders.push(this.createHasBodyCodeLens);*/

        for(let query of document.queries) {
            
            let range = this.getRangeWithin(textDocument, query.textTokens[0]);
            
            for(let provider of queryCodeLensProviders) {
                let codeLens = provider.call(this, query, configuration, range);
            
                if(codeLens) {
                    codeLenses.push(codeLens);
                }
            }

        }
        
        return codeLenses;

    }
    
    public resolveCodeLens?(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {
        return null;
    }

    private createConfigurationRunAllCodeLens(configuration:any, document:ElasticsearchQueryDocument, range:vscode.Range): vscode.CodeLens {

        if(document.hasQueries) {
            
            const runAllQueriesCommand = this.getCommand(constant.ElasticsearchQueryCodeLensCommandRunAllQueries);
            
            return new vscode.CodeLens(range, {
                title: 'run all queries',
                command: runAllQueriesCommand,
                arguments: [document.queries, configuration]
            });

        }

        return null;
    }

    private createRunQueryCodeLens(query:ElasticsearchQuery, configuration:any, range:vscode.Range): vscode.CodeLens {

        const runQueryCommand = this.getCommand(constant.ElasticsearchQueryCodeLensCommandRunQuery);
        let codeLensTitle = 'run query';

        if(query.isBulk) {
            codeLensTitle = 'run bulk query (size: '+ query.bulk.length +')'
        }

        return new vscode.CodeLens(range, {
            title: codeLensTitle,
            command: runQueryCommand,
            arguments: [query, configuration]
        });

    }

    private createHasNameCodeLens(query:ElasticsearchQuery, configuration:any, range:vscode.Range): vscode.CodeLens {

        if(query.hasName) {
                
            return new vscode.CodeLens(range, {
                title: query.name,
                command: ''
            });
        }

    }

    private createHasBodyCodeLens(query:ElasticsearchQuery, configuration:any, range:vscode.Range): vscode.CodeLens {

        if(query.hasBody) {
                
            return new vscode.CodeLens(range, {
                title: 'has body',
                command: ''
            });
        }

    }

    private createShowUrlCodeLens(query:ElasticsearchQuery, configuration:any, range:vscode.Range): vscode.CodeLens {

        if(query.hasCommand) {
                
            let url = query.getUrl();
            return new vscode.CodeLens(range, {
                title: url,
                command: ''
            });
        }

    }

    private createOpenEndpointDocumentationCodeLens(query:ElasticsearchQuery, configuration:any, range:vscode.Range): vscode.CodeLens {

        if(query.hasEndpointId) {

            const command = this.getCommand(constant.IntelliSenseCodeLensCommandOpenEndpointDocumentation);

            return new vscode.CodeLens(range, {
                title: 'open endpoint documentation',
                command: command,
                arguments:[query.endpointId]
            });
    
        }
    
        return null;

    }
}