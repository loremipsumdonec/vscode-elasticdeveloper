'use strict'

import * as vscode from 'vscode';
import * as constant from '../constant';

import { IndexTemplateController } from "./indexTemplateController";
import { IndexTemplateDocument } from '../parsers/indexTemplateDocument';
import { IndexTemplate } from '../models/indexTemplate';

export class IndexTemplateCodeLensController extends IndexTemplateController 
    implements vscode.CodeLensProvider {
    
    public onDidChangeCodeLenses?: vscode.Event<void>;
    
    public registerCommands() {

        this.registerCommand(constant.IndexTemplateCodeLensCommandDeploy, (indexTemplate) => { this.deploy(indexTemplate) });
        this.registerCommand(constant.IndexTemplateCodeLensCommandRetract, (indexTemplate) => { this.retract(indexTemplate) });

        this.registerCodeLensProvider(constant.IndexTemplateDocumentSelector, this);
    }

    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
        
        var codeLenses = [];
        
        let text = document.getText();
        let indexTemplateDocument = IndexTemplateDocument.parse(text);
        
        for(let indexTemplate of indexTemplateDocument.indexTemplates) {

            indexTemplate.name = this.getIndexTemplateName(document.fileName);
            let range = this.getRangeWithin(document, indexTemplate.textTokens[0]);
            let deployCodeLens = this.createDeployCodeLens(indexTemplate, range);
            codeLenses.push(deployCodeLens);
        
            let retractCodeLens = this.createRetractCodeLens(indexTemplate, range);
            codeLenses.push(retractCodeLens);
        }

        return codeLenses;
    }
    
    public resolveCodeLens?(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {
        return null;
    }

    private createRetractCodeLens(indexTemplate: IndexTemplate, range:vscode.Range): vscode.CodeLens {

        const command = this.getCommand(constant.IndexTemplateCodeLensCommandRetract);

        let codeLens = new vscode.CodeLens(range, {
            title: 'retract',
            command: command,
            arguments: [indexTemplate]
        });

        return codeLens;

    }

    private createDeployCodeLens(indexTemplate: IndexTemplate, range:vscode.Range): vscode.CodeLens {

        const command = this.getCommand(constant.IndexTemplateCodeLensCommandDeploy);

        let codeLens = new vscode.CodeLens(range, {
            title: 'deploy',
            command: command,
            arguments: [indexTemplate]
        });

        return codeLens;
    }

}