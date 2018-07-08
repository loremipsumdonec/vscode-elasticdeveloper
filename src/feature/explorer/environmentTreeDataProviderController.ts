'use strict'

import * as vscode from 'vscode';
import * as constant from '../../constant'
import { ITreeNode, EnvironmentsParentTreeNode, IParentTreeNode, ParentTreeNode } from './models/interfaces';
import { EnvironmentController } from "../../controllers/environmentController";

export class EnvironmentTreeDataProviderController  extends EnvironmentController 
    implements vscode.TreeDataProvider<ITreeNode> {

    private _onDidChangeTreeDataEmitter: vscode.EventEmitter<ITreeNode>;

    public initiate() {
        this._onDidChangeTreeDataEmitter = new vscode.EventEmitter<ITreeNode>();
        vscode.window.registerTreeDataProvider('elasticdeveloper-explorer', this);

        this.registerCommand(constant.ExplorerCommandRefreshNode, (input)=> { this.refresh(input) });
    }

    public get onDidChangeTreeData(): vscode.Event<ITreeNode> {
        return this._onDidChangeTreeDataEmitter.event;
    }
    
    public async getTreeItem(element: ITreeNode): Promise<vscode.TreeItem> {

        await element.prepare();

        return {
            id: element.globalId,
            label: element.label,
            tooltip: element.globalId,
            collapsibleState: element.isParent ? vscode.TreeItemCollapsibleState.Collapsed: vscode.TreeItemCollapsibleState.None,
            iconPath:element.iconPath,
            contextValue: element.contextValue
        };
    }
    
    public async getChildren(treeNode?: ITreeNode): Promise<ITreeNode[]> {
        
        let children:ITreeNode[] = [];

        if(treeNode instanceof ParentTreeNode) {
            children = await treeNode.getChildren();
        } else if(!treeNode) {
            children = this.loadRoot();
        }

        return children;
    }
    
    public getParent?(element: ITreeNode): vscode.ProviderResult<ITreeNode> {
        return null;
    }

    public refresh(node?:ITreeNode) {

        if(node) {
            this._onDidChangeTreeDataEmitter.fire(node);
        } else {
            this._onDidChangeTreeDataEmitter.fire(null);
        }

    }

    private loadRoot(): ITreeNode[] {
        let children:ITreeNode[] = [];

        children.push(new EnvironmentsParentTreeNode(this));

        return children;
    }
}