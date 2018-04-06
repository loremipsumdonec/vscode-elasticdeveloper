'use strict'

import * as vscode from 'vscode';
import * as constant from '../constant'

import { EnvironmentController } from "./environmentController";
import { Environment } from '../models/environment';
import { EnvironmentDocument } from '../parsers/environmentDocument';
import { TextToken } from '../models/textToken';
import { EnvironmentManager } from '../managers/environmentManager';

export class EnvironmentCodeLensController extends EnvironmentController 
    implements vscode.CodeLensProvider {
    
    public onDidChangeCodeLenses?: vscode.Event<void>;
    
    public registerCommands() {

        this.registerCommand(constant.EnvironmentCodeLensCommandPing, (environment) => { this.ping(environment) });
        this.registerCommand(constant.EnvironmentCodeLensCommandSetAsTarget, (environment) => { this.setAsTarget(environment) });
        this.registerCodeLensProvider(constant.EnvironmentDocumentSelector, this);
    }

    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
        
        var codeLenses = [];
        
        let text = document.getText();
        let environmentDocument = EnvironmentDocument.parse(text);

        for(let environment of environmentDocument.environments) {

            let range = this.getRangeWithin(document, environment.textTokens[0]);

            let pingEnvironmentCodeLens = this.createPingCodeLens(environment, range);
            codeLenses.push(pingEnvironmentCodeLens);

            let setTargetCodeLens = this.createSetTargetCodeLens(environment, document, range);
            codeLenses.push(setTargetCodeLens);
        }
        
        return codeLenses;
    }
    
    public resolveCodeLens?(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {
        return null;
    }

    private createPingCodeLens(environment: Environment, range:vscode.Range): vscode.CodeLens {

        const command = this.getCommand(constant.EnvironmentCodeLensCommandPing);

        let name = environment.name;

        if(!name) {
            name = '';
        }

        let codeLens = new vscode.CodeLens(range, {
            title: 'ping '+ name  +' environment',
            command: command,
            arguments: [environment]
        });

        return codeLens;
    }

    private createSetTargetCodeLens(environment: Environment, textDocument:vscode.TextDocument, range:vscode.Range): vscode.CodeLens {

        const command = this.getCommand(constant.EnvironmentCodeLensCommandSetAsTarget);

        let name = environment.name;

        if(!name) {
            name = '';
        }

        let codeLens = new vscode.CodeLens(range, {
            title: 'set ' + name  + ' as target',
            command: command,
            arguments: [environment, textDocument.uri]
        });

        return codeLens;
    }
}