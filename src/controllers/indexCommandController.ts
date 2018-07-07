'use strict'

import * as vscode from 'vscode';
import * as constant from '../constant'

import { IndexController } from './indexController';
import { IndexTreeNode } from '../feature/explorer/models/interfaces';

export class IndexCommandController extends IndexController  {
    
    public registerCommands() {
        this.registerCommand(constant.IndexExplorerCommandDelete, (input)=> { this.deleteWithNode(input) });
    }

    private async deleteWithNode(node:IndexTreeNode) {

        let environment = node.environment;

        if(environment) {

            let status = await vscode.window.showInputBox({ prompt: 'Are you sure you want to delete index "' + node.label + '" from environment '+ environment + '?' });

            if(status != null) {
                await this.delete(node.label, node.environment);
                node.parent.refresh();
            }
        }
    }
}