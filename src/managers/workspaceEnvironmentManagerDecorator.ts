'use strict'

import * as vscode from 'vscode';
import * as path from 'path'
import { Environment } from "../models/environment";
import { Index } from "../models/index";
import { EnvironmentManagerDecorator } from "./environmentManagerDecorator";
import { EnvironmentManager } from "./environmentManager";

const WorkspaceStateEnvironmentTargetKey = 'environment.target';

export class WorkspaceEnvironmentManagerDecorator extends EnvironmentManagerDecorator {

    private _context: vscode.ExtensionContext;

    constructor(context:vscode.ExtensionContext, manager:EnvironmentManager) {
        super(manager);

        this._context = context;
    }

    public async init() {

        vscode.workspace.onDidSaveTextDocument(this.onDidSaveTextDocument);

        let files:vscode.Uri[]  = await vscode.workspace.findFiles('**/*.{esind}');
        
        for(let file of files) {
            this.addIndexWithUri(file);   
        }

    }

    public get environment(): Environment {

        let env = super.environment;

        if(!env) {
            env = this.getWorkspaceState(WorkspaceStateEnvironmentTargetKey);

            if(env) {
                super.environment = Environment.hydrate(env);
                env = super.environment;
            }
        }

        return env;
    }

    public set environment(value:Environment) {
        
        this.updateWorkspaceState(WorkspaceStateEnvironmentTargetKey, value);
        super.environment = value;
    }

    private onDidSaveTextDocument(e:vscode.TextDocument) {
        
        if(e.languageId === 'esind') {
            this.addIndexWithUri(e.uri);
        }
    }

    private addIndexWithUri(uri:vscode.Uri) {

        let name = path.basename(uri.fsPath).split('.')[0];

        let index:Index = {
            id: uri.fsPath,
            name: name
        };

        this.addIndex(index);
    }

    private getWorkspaceState<T>(key:string): T | undefined {
        return this._context.workspaceState.get<T>(key);
    }

    private updateWorkspaceState(key:string, value:any) {
        this._context.workspaceState.update(key, value);
    }

}

export function decorate(context:vscode.ExtensionContext) {

    return (manager) => {
        let decoratedManager = new WorkspaceEnvironmentManagerDecorator(context, manager);
        decoratedManager.init();
        
        return decoratedManager;
    }
}