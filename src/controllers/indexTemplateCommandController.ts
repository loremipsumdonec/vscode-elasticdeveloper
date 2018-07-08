'use strict'

import * as vscode from 'vscode';
import * as constant from '../constant'

import { IndexTemplateController } from './indexTemplateController';
import { IndexTemplateDocument } from '../parsers/indexTemplateDocument';
import { ITreeNode } from '../feature/explorer/models/interfaces';
import { IndexTemplate } from '../models/indexTemplate';
import { ElasticsearchQuery } from '../models/elasticSearchQuery';

export class IndexTemplateCommandController extends IndexTemplateController  {
    
    public registerCommands() {
        this.registerCommand(constant.IndexTemplateCommandDeploy, (input)=> { this.deployWithUri(input) });
        this.registerCommand(constant.IndexTemplateCommandRetract, (input)=> { this.retractWithUri(input) });
        this.registerCommand(constant.IndexTemplateExplorerCommandRetract, (input)=> { this.retractWithNode(input) });
        this.registerCommand(constant.IndexTemplateExplorerCommandCompare, (input)=> { this.compareWithNode(input) });
        this.registerCommand(constant.IndexTemplateExplorerCommandCreateFile, (input)=> { this.createFileWithNode(input) });
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
        indexTemplate.name = input.id;

        await this.retract(indexTemplate, input.environment);
        input.parent.refresh();

    }

    private async createFileWithNode(input:ITreeNode) {
        
        let indexTemplateName = input.id;
        let files = await vscode.workspace.findFiles('**/' + indexTemplateName +'.' + constant.IndexTemplateLanguageId);

        let query = ElasticsearchQuery.parse('GET /_template/' + indexTemplateName);
        let response = await this.executeQuery(query, input.environment);

        if(response.completed) {

            let deployedIndexTemplate = response.body[indexTemplateName];
            let deployedIndexTemplateContent = JSON.stringify(deployedIndexTemplate,null, 4);

            let deployedIndexTemplateTextDocument= await vscode.workspace.openTextDocument({
                language: constant.IndexTemplateLanguageId, content: deployedIndexTemplateContent
            });

            vscode.window.showTextDocument(deployedIndexTemplateTextDocument);
        }
    }
 
    private async compareWithNode(input:ITreeNode) {

        let indexTemplateName = input.id;
        let files = await vscode.workspace.findFiles('**/' + indexTemplateName +'.' + constant.IndexTemplateLanguageId);

        if(files.length > 0) {

            let query = ElasticsearchQuery.parse('GET /_template/' + indexTemplateName);
            let response = await this.executeQuery(query, input.environment);

            if(response.completed) {

                let title:string = this.environment.host + '/_template/' + indexTemplateName + '<->' + files[0].path;

                let workspaceIndexTemplateTextDocument = await vscode.workspace.openTextDocument(files[0]);
                let text = workspaceIndexTemplateTextDocument.getText();
                let document = IndexTemplateDocument.parse(text);

                if(document.indexTemplates.length > 0) {

                    let workspaceIndexTemplateContent = JSON.stringify(document.indexTemplates[0],null, 4);
                    let workspaceIndexTemplatePath = await this.createTemporaryFileWithContent(workspaceIndexTemplateContent);
                    workspaceIndexTemplateTextDocument = await vscode.workspace.openTextDocument(workspaceIndexTemplatePath);

                    let deployedIndexTemplate = response.body[indexTemplateName];
                    let deployedIndexTemplateContent = JSON.stringify(deployedIndexTemplate,null, 4);
                    let deployedIndexTemplatePath = await this.createTemporaryFileWithContent(deployedIndexTemplateContent);
                    let deployedIndexTemplateTextDocument:vscode.TextDocument = await vscode.workspace.openTextDocument(deployedIndexTemplatePath);

                    vscode.commands.executeCommand('vscode.diff', deployedIndexTemplateTextDocument.uri, workspaceIndexTemplateTextDocument.uri, title);
                }
            }

        }
    }
}