'use strict'

import * as vscode from 'vscode';
import * as constant from '../constant'

import { ScriptController } from './scriptController';
import { ITreeNode } from '../feature/explorer/models/interfaces';

export class ScriptCommandController extends ScriptController  {
    
    public registerCommands() {
        this.registerCommand(constant.ScriptExplorerCommandRetract, (input)=> { this.retractWithNode(input) });
    }

    private async deployWithUri(input:any) {
    }

    private async retractWithUri(input:any) {        
    }

    private async retractWithNode(input:ITreeNode) {

        await this.retract(input.id, input.environment);
        input.parent.refresh();

    }

    private async createFileWithNode(input:ITreeNode) {
    }
 
    private async compareWithNode(input:ITreeNode) {
    }
}