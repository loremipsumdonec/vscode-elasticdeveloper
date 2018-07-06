import { Uri, TreeItem } from 'vscode';

export interface IElasticTreeItem {
    id?:string;
    label:string;
    description?:string;
    iconPath?: string | Uri | { light: string | Uri; dark: string | Uri };
    commandId?: string;
    contextValue: string;
}

export interface IElasticNode<T extends TreeItem = TreeItem> {

    readonly id:string;
    readonly treeItem: T;
}

export interface IElasticParentNode<T extends TreeItem = TreeItem> extends IElasticNode<T> {

    getChildren(): Promise<IElasticNode[]>;
}

export class ElasticNode<T extends TreeItem = TreeItem> implements IElasticNode<T> {

    id: string;    
    treeItem: T;
}

export class ElasticParentNode<T extends TreeItem = TreeItem> extends ElasticNode<T> implements IElasticParentNode<T> {
    
    getChildren(): Promise<IElasticNode<TreeItem>[]> {
        throw new Error("Method not implemented.");
    }    
    
}