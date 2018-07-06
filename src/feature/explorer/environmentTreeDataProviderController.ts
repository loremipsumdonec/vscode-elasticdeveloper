'use strict'

import * as vscode from 'vscode';
import { ITreeNode, EnvironmentsParentTreeNode } from './models/interfaces';
import { EnvironmentController } from "../../controllers/environmentController";
import { EnvironmentManager } from '../../managers/environmentManager';

export class EnvironmentTreeDataProviderController  extends EnvironmentController 
    implements vscode.TreeDataProvider<ITreeNode> {

    private _onDidChangeTreeDataEmitter: vscode.EventEmitter<ITreeNode>;

    public initiate() {
        this._onDidChangeTreeDataEmitter = new vscode.EventEmitter<ITreeNode>();

        vscode.window.registerTreeDataProvider('elasticdeveloper-explorer', this);
    }

    public get onDidChangeTreeData(): vscode.Event<ITreeNode> {
        return this._onDidChangeTreeDataEmitter.event;
    }
    
    public getTreeItem(element: ITreeNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return {
            id: element.globalId,
            label: element.label,
            tooltip: element.globalId,
            collapsibleState: element.isParent ? vscode.TreeItemCollapsibleState.Collapsed: vscode.TreeItemCollapsibleState.None,
            iconPath:element.isParent ? vscode.ThemeIcon.Folder: vscode.ThemeIcon.File,
        };
    }
    
    public async getChildren(treeNode?: ITreeNode): Promise<ITreeNode[]> {
        
        let children:ITreeNode[] = [];

        if(treeNode) {
            children = await this.loadChildren(treeNode);
        } else {
            children = this.loadRoot();
        }

        return children;
    }
    
    public getParent?(element: ITreeNode): vscode.ProviderResult<ITreeNode> {
        return null;
    }

    public refresh(node:ITreeNode) {
        this._onDidChangeTreeDataEmitter.fire(node);
    }

    private loadRoot(): ITreeNode[] {
        let children:ITreeNode[] = [];

        //children.push(new EnvironmentObjectTreeNode(this));
        children.push(new EnvironmentsParentTreeNode(this));

        return children;
    }

    private async loadChildren(treeNode: ITreeNode):Promise<ITreeNode[]> {
        return await treeNode.loadChildren();
    } 
}