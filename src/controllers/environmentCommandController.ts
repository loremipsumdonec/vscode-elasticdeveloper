'use strict'

import * as vscode from 'vscode';
import * as constant from '../constant'

import { EnvironmentController } from "./environmentController";
import { EnvironmentDocument } from '../parsers/environmentDocument';
import { Environment } from '../models/environment';

export class EnvironmentCommandController extends EnvironmentController  {
    
    public registerCommands() {
        this.registerCommand(constant.EnvironmentCommandPing, (input)=> { this.pingWithUri(input) });
        this.registerCommand(constant.EnvironmentCommandSetAsTarget, (input)=> { this.setAsTargetWithUri(input) });
    }

    private async pingWithUri(input:any) {

        let uri = this.getActiveDocumentUri(input, constant.EnvironmentLanguageId);

        if(uri) {

            let textDocument = await vscode.workspace.openTextDocument(uri);
            let text = textDocument.getText();
            let document = EnvironmentDocument.parse(text);
    
            if(document.environments.length > 0) {
                this.ping(document.environments[0]);
            }
            
        }

    }

    private async setAsTargetWithUri(input:any) {

        let uri = this.getActiveDocumentUri(input, constant.EnvironmentLanguageId);

        if(uri) {

            let textDocument = await vscode.workspace.openTextDocument(uri);
            let text = textDocument.getText();
            let document = EnvironmentDocument.parse(text);
    
            if(document.environments.length > 0) {
                this.setAsTarget(document.environments[0]);
            }
            
        }
        
    }
}