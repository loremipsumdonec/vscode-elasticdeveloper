'use strict'

import * as vscode from 'vscode';
import * as constant from '../constant';
import * as fs from 'fs';
import * as path from 'path'

import { QueryController } from './queryController';
import { ElasticsearchQueryDocument} from '../parsers/elasticSearchQueryDocument';

export class QueryCommandController extends QueryController {

    public registerCommands() {

        this.registerCommand(constant.ElasticsearchQueryCommandRunAllQueries, 
            (input) => { 
                this.runAllQueriesInUri(input) 
            });

        this.registerTextEditorCommand(constant.ElasticsearchQueryTextEditorCommandRunAllQueries, 
            (input) => { 
                this.runAllQueriesInUri(input) 
            });
    }

    private async runAllQueriesInUri(input:any) {

        let uri = this.getActiveDocumentUri(input, constant.ElasticsearchQueryLanguageId);

        if(uri) {

            let textDocument = await vscode.workspace.openTextDocument(uri);
            let text = textDocument.getText();
            let document = ElasticsearchQueryDocument.parse(text);
            let configuration = null;

            if(document.hasConfigurations) {
                configuration = document.configurations[0];
                configuration.source = uri.fsPath;
            }
    
            this.runAllQueries(document.queries, configuration);
            
        }
        
    }
}