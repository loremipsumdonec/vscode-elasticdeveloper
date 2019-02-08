'use strict'

import * as vscode from 'vscode';
import * as constant from '../constant';

import { QueryController } from './queryController';
import { ElasticsearchQueryDocument} from '../parsers/elasticsearchQueryDocument';
import { ElasticsearchQuery } from '../models/elasticsearchQuery';

export class QueryCodeLensController extends QueryController
    implements vscode.CodeLensProvider {

    private _onDidChangeCodeLensesEventEmitter: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    private _queryCodeLensProviders:((query:ElasticsearchQuery, configuration:any, range:vscode.Range) => vscode.CodeLens)[] = []

    public get onDidChangeCodeLenses(): vscode.Event<void> {
        return this._onDidChangeCodeLensesEventEmitter.event;
    }

    protected initiate() {

        this.loadQueryCodeLensProviders();
        super.initiate();
    }

    protected registerCommands() {

        this.registerCommand(constant.ElasticsearchQueryCodeLensCommandRunQuery,
            (query, configuration) => { this.runQuery(query, configuration) });

        this.registerCommand(constant.ElasticsearchQueryCodeLensCommandRunAllQueries,
            (queries, configuration) => { this.runAllQueries(queries, configuration)});

        this.registerCodeLensProvider(constant.ElasticsearchQueryDocumentSelector, this);
    }

    protected registerEventSubscriptions() {
        super.registerEventSubscriptions();

        vscode.workspace.onDidChangeConfiguration((e)=> {
            this.loadQueryCodeLensProviders();
            this._onDidChangeCodeLensesEventEmitter.fire();
        });
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

        for(let query of document.queries) {

            let range = this.getRangeWithin(textDocument, query.textTokens[0]);

            for(let provider of this._queryCodeLensProviders) {
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

    private loadQueryCodeLensProviders() {

        let configuration = vscode.workspace.getConfiguration();
        this._queryCodeLensProviders = [];

        this._queryCodeLensProviders.push(this.createRunQueryCodeLens);
        this._queryCodeLensProviders.push(this.createHasNameCodeLens);

        let value = configuration.get(constant.IntelliSenseConfigurationCodeLensCommandOpenEndpointDocumentationEnabled);
        if(value) {
            this._queryCodeLensProviders.push(this.createOpenEndpointDocumentationCodeLens);
        }

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
