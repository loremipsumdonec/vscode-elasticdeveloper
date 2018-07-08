'use strict'

import * as vscode from 'vscode';
import * as constant from '../constant'

import { IndexTemplateController } from './indexTemplateController';
import { IndexTemplateDocument } from '../parsers/indexTemplateDocument';
import { ITreeNode } from '../feature/explorer/models/interfaces';
import { IndexTemplate } from '../models/indexTemplate';

export class IndexTemplateCommandController extends IndexTemplateController  {
    
    public registerCommands() {
        this.registerCommand(constant.IndexTemplateCommandDeploy, (input)=> { this.deployWithUri(input) });
        this.registerCommand(constant.IndexTemplateCommandRetract, (input)=> { this.retractWithUri(input) });
        this.registerCommand(constant.IndexTemplateExplorerCommandRetract, (input)=> { this.retractWithNode(input) });
    }

    private async deployWithUri(input:any) {

        let uri = this.getActiveDocumentUri(input, constant.EnvironmentLanguageId);

        if(uri) {

            let textDocument = await vscode.workspace.openTextDocument(uri);
            let text = textDocument.getText();
            let document = IndexTemplateDocument.parse(text);
            
            if(document.indexTemplates.length > 0) {
                let indexTemplate = document.indexTemplates[0];
                indexTemplate.name = this.getIndexTemplateName(textDocument.fileName);

                this.deploy(document.indexTemplates[0]);
            }
            
        }

    }

    private async retractWithUri(input:any) {

        let uri = this.getActiveDocumentUri(input, constant.EnvironmentLanguageId);

        if(uri) {

            let textDocument = await vscode.workspace.openTextDocument(uri);
            let text = textDocument.getText();
            let document = IndexTemplateDocument.parse(text);
            
            if(document.indexTemplates.length > 0) {
                let indexTemplate = document.indexTemplates[0];
                indexTemplate.name = this.getIndexTemplateName(textDocument.fileName);
                
                this.retract(document.indexTemplates[0]);
            }
            
        }
        
    }

    private async retractWithNode(input:ITreeNode) {

        let indexTemplate = new IndexTemplate();
        indexTemplate.name = input.label;

        await this.retract(indexTemplate);
        input.parent.refresh();

    }
}