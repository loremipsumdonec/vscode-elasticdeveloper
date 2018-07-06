import * as vscode from 'vscode';

import { ElasticsearchResponse } from "../../../models/elasticSearchResponse";
import { EnvironmentManager } from "../../../managers/environmentManager";
import { ElasticService } from "../../../services/elasticService";
import { ElasticsearchQuery } from "../../../models/elasticSearchQuery";
import { ThemeIcon, Uri, env } from "vscode";
import { Environment } from "../../../models/environment";
import { EnvironmentTreeDataProviderController } from "../environmentTreeDataProviderController";
import { EnvironmentDocument } from '../../../parsers/environmentDocument';
import { stat } from 'fs';

export interface IElasticTreeItem {

    id?:string;
    label:string;
    description?:string;
    commandId?: string;
    contextValue: string;
}

export interface ITreeNode {
    id:string;
    globalId:string;
    label:string;
    parent?: ITreeNode;
    treeDataProvider:EnvironmentTreeDataProviderController,
    isParent: boolean;
    iconPath?: string | Uri | { light: string | Uri; dark: string | Uri } | ThemeIcon;
    loadChildren(): ITreeNode[] | Promise<ITreeNode[]>;
}

export interface IParentTreeNode extends ITreeNode {
    addChild(child:ITreeNode);
}

export interface IEnvironmentTreeNode  {
    resourcePath: Uri;
    environment:Environment;
}

export interface IQueryTreeNode extends ITreeNode {
    query:string;
}

export class TreeNode implements ITreeNode {

    private _id:string;
    private _globalId:string;
    private _label:string;
    private _treeDataProvider:EnvironmentTreeDataProviderController;
    private _parent:ITreeNode;
    private _iconPath:string | Uri | { light: string | Uri; dark: string | Uri } | ThemeIcon;
    
    constructor(id:string, label?:string, iconPath?:ThemeIcon) {
        this._id = id;

        if(label) {
            this._label = label;
        } else {
            this._label = id;
        }
        
        this._iconPath = iconPath;
    }

    public get id():string {
        return this._id;
    }

    public set id(id:string) {
        this._id = id;
    }

    public get globalId():string {

        if( !(this._globalId && this._globalId.length > 0)) {
            if(this.parent) {
                this._globalId = this.parent.globalId + '/' + this._id;
            } else {
                this._globalId = this._id;
            }
        }

        return this._globalId;
    }

    public get label():string {
        return this._label;
    }

    public set label(label:string) {
        this._label = label;
    }

    public get treeDataProvider():EnvironmentTreeDataProviderController {

        if(this._treeDataProvider) {
            return this._treeDataProvider;
        } else if(this.parent) {
            return this.parent.treeDataProvider;
        } else {
            throw new Error('TreeNode missing a treeDataProvider');
        }
    }

    public set treeDataProvider(value:EnvironmentTreeDataProviderController) {
        this._treeDataProvider = value;
    }

    public get isParent():boolean {
        return false;
    }

    public get iconPath():string | Uri | { light: string | Uri; dark: string | Uri } | ThemeIcon {
        return this._iconPath;
    }

    public get parent():ITreeNode {
        return this._parent;
    }

    public set parent(value:ITreeNode) {
        this._parent = value;
    }

    public loadChildren(): ITreeNode[] | Promise<ITreeNode[]> {
        throw new Error("Method not implemented.");
    }

    public refresh() {
        this.treeDataProvider.refresh(this);
    }
}

export class ParentTreeNode extends TreeNode implements IParentTreeNode {

    private _children:ITreeNode[] = [];

    constructor(id:string, label?:string, iconPath?:ThemeIcon) {
        super(id, label, ThemeIcon.Folder)
    }

    public get isParent():boolean {
        return true;
    }

    protected get children():ITreeNode[] {
        return this._children;
    }

    public addChild(child:ITreeNode) {
        child.parent = this;
        this._children.push(child);
    }

    public removeChildren(remove:ITreeNode[]) {

        let children:ITreeNode[] = [];

        for(let child of this._children) {

            let exists = remove.find(n=> n.id === child.id);

            if(!exists) {
                children.push(child);
            }
            
        }

        this._children = children;
    }

    public loadChildren(): ITreeNode[] | Promise<ITreeNode[]> {
        return this._children;
    }

}

export class ObjectTreeNode extends ParentTreeNode {

    private _object:any;

    constructor(id:string, object:any, label?:string) {
        super(id, label, ThemeIcon.Folder);
        this._object = object;
    }

    public get isParent():boolean {
        return true;
    }

    protected get object():any {
        return this._object;
    }

    public loadChildren(): ITreeNode[] | Promise<ITreeNode[]> {

        let children:ITreeNode[] = [];

        for(let key in this.object) {

            let id = key + ': ' + this.object[key];
            children.push(new TreeNode(id));
        }

        return children;
    }
}

export class EnvironmentsParentTreeNode extends ParentTreeNode {
 
    constructor(treeDataProvider:EnvironmentTreeDataProviderController) {
        super('environments')
    
        this.treeDataProvider = treeDataProvider;

        let watcher = vscode.workspace.createFileSystemWatcher('**/*.esenv');
        watcher.onDidChange((e)=> {
            this.onEnvironmentFileChange(e);
        });

        watcher.onDidCreate(this.onEnvironmentFileCreate);
        watcher.onDidDelete(this.onEnvironmentFileDelete);
        
    }

    public async loadChildren(): Promise<ITreeNode[]> {
        
        let files = await vscode.workspace.findFiles('**/*.esenv');
        let notVisited:ITreeNode[] = [];
        this.children.forEach(c=> notVisited.push(c));

        for(let fileUri of files) {

            let document = await EnvironmentDocument.get(fileUri);

            for(let environment of document.environments) {

                let exists = this.children.find(n=> n.id === environment.id) as EnvironmentTreeNode;

                if(exists) {
                    exists.environment = environment;
                    notVisited = notVisited.filter(n => n.id !== exists.id);
                } else {
                    this.addChild(new EnvironmentTreeNode(environment, fileUri));
                }
            }

        }

        this.removeChildren(notVisited);
        this.children.sort((a, b) => a.id.localeCompare(b.id));

        return super.loadChildren();
    }

    private async onEnvironmentFileChange(fileUri:vscode.Uri) {
        this.refresh();
    }

    private onEnvironmentFileDelete(e:vscode.Uri) {
        this.refresh();
    }

    private onEnvironmentFileCreate(e:vscode.Uri) {
        this.refresh();
    }

}

export class EnvironmentTreeNode extends ParentTreeNode implements IEnvironmentTreeNode {

    private _environment:Environment;
    private _resourcePath:Uri;

    constructor(environment:Environment, resourcePath: vscode.Uri) {
        super(environment.id, environment.name);

        this._environment = environment;
        this._resourcePath = resourcePath;
    }

    public set environment(environment:Environment) {
        this._environment = environment;
        this.label = environment.name;
    }

    public get environment(): Environment {
        return this._environment;
    }

    public set resourcePath(resourcePath:Uri) {
        this._resourcePath = resourcePath;
    }

    public get resourcePath(): Uri {
        return this._resourcePath;
    }

    public loadChildren(): ITreeNode[] | Promise<ITreeNode[]> {

        this.addChild(new IndicesQueryTreeNode());
        this.addChild(new AliasesQueryTreeNode());

        return super.loadChildren();
    }

}

abstract class QueryTreeNode extends ParentTreeNode implements IQueryTreeNode {

    private _query:string;

    constructor(id:string, query:string) {
        super(id);

        this._query = query;
    }
    
    public get isParent():boolean {
        return true;
    }
    
    protected get environment():Environment {

        let environment = null;

        if(this.parent) {

            let stack:any[] = [];
            stack.push(this.parent);

            while(stack.length > 0){
                let current = stack.pop();

                if(current.environment) {
                    environment = current.environment;
                } else {
                    stack.push(current.parent);
                }
            }
        }

        return environment;
    }

    public get query():string {
        return this._query;
    }
    
    public set query(value:string) {
        this._query = value;
    }

    public async loadChildren(): Promise<ITreeNode[]> {

        let response = await this.executeQuery();
        let children = this.getChildren(response);
        children.forEach(child => this.addChild(child));

        return super.loadChildren();
    }

    protected async executeQuery() : Promise<ElasticsearchResponse> {

        let response: ElasticsearchResponse = null;
        let query:ElasticsearchQuery = ElasticsearchQuery.parse(this._query);

        try{

            if(this.environment) {

                try {
                    response = await ElasticService.execute(query, this.environment);
                }catch(ex) {
                    response = ex;
                    response.environment = this.environment;
                }                
        
            }

        }catch(ex) {

            response = {
                message: ex.message,
                completed: false 
            };
        }

        return response;
    }

    protected getChildren(response:ElasticsearchResponse):ITreeNode[] {
        return [];
    }
}

export class IndicesQueryTreeNode extends QueryTreeNode {
    
    constructor() {
        super('indices','GET /_cat/indices');
    }

    protected getChildren(response:ElasticsearchResponse): ITreeNode[] {

        let children:ITreeNode[] = [];

        if(response.completed) {

            for(let d of response.body) {
                children.push(new IndexObjectTreeNode(d));
            }
        }

        return children;
    }

}

export class AliasesQueryTreeNode extends QueryTreeNode {
    
    private _loadOnlyAlias:boolean;

    constructor(query?:string, loadOnlyAlias:boolean = false) {
        super('aliases','GET /_alias');

        this._loadOnlyAlias = loadOnlyAlias;
        
        if(query) {
            this.query = query;
        }
        
    }

    protected getChildren(response:ElasticsearchResponse): ITreeNode[] {

        let children:ITreeNode[] = [];

        if(response.completed) {

            let indices = Object.keys(response.body);

            for(let index of indices) {
                let aliases = Object.keys(response.body[index].aliases);

                for(let alias of aliases) {

                    if(this._loadOnlyAlias) {

                        let exists = children.find(n=> n.id === alias) as TreeNode;

                        if(!exists) {
                            exists = new TreeNode(alias);
                            children.push(exists);
                        }

                    } else {

                        let exists = children.find(n=> n.id === alias) as ParentTreeNode;

                        if(!exists) {
                            exists = new ParentTreeNode(alias);
                            children.push(exists);
                        }
                        
                        exists.addChild(new TreeNode(index));
                    }
                }
            }
        }

        return children;
    }

}

export class IndicesMappingsQueryTreeNode extends QueryTreeNode {

    private _index:any;

    constructor(id:string, index:any) {
        super(id,'GET /' + index.index + '/_mapping');

        this._index = index;
    }

    protected getChildren(response:ElasticsearchResponse): ITreeNode[] {

        let children:ITreeNode[] = [];

        if(response.completed) {

            if(response.body[this._index.index] &&  response.body[this._index.index].mappings) {

                let keys = Object.keys(response.body[this._index.index].mappings);
                for(let key of keys) {

                    let node = new ParentTreeNode(key);
                    node.parent = this;
                    let properties = response.body[this._index.index].mappings[key].properties;
                    
                    this.buildMappingTree(node, properties);
                    children.push(node);
                }
            }

        }

        return children;
    }

    private buildMappingTree(root:ParentTreeNode, properties:any) {

        let keys = Object.keys(properties);

        for(let key of keys) {

            let type = properties[key].type;
            let label = key + ': ' + type;

            if(properties[key].fields) {
                let node = new ParentTreeNode(label);
                node.parent = root;

                this.buildMappingTree(node, properties[key].fields);
                root.addChild(node);
            } else {
                let node = new TreeNode(label);
                node.parent = root;

                root.addChild(node);
            }
        }

    }
}

export class IndexObjectTreeNode extends ParentTreeNode {
    
    private _index:any;

    constructor(index:any) {
        super(index.index);
    
        this._index = index;
    }

    public loadChildren(): ITreeNode[] | Promise<ITreeNode[]> {

        this.addChild(new IndicesMappingsQueryTreeNode('mappings', this._index))
        this.addChild(new AliasesQueryTreeNode('GET /'+ this._index.index +'/_alias/*', true));

        return super.loadChildren();
    }

    protected get
}
