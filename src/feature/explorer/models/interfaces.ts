import * as vscode from 'vscode';
import * as ElasticsearchQueryManager from '../../../models/elasticSearchQuery';

import { ElasticsearchResponse } from "../../../models/elasticSearchResponse";
import { EnvironmentManager } from "../../../managers/environmentManager";
import { ElasticService } from "../../../services/elasticService";
import { ElasticsearchQuery } from "../../../models/elasticSearchQuery";

import { ThemeIcon, Uri, env } from "vscode";
import { Environment } from "../../../models/environment";
import { EnvironmentTreeDataProviderController } from "../environmentTreeDataProviderController";
import { EnvironmentDocument } from '../../../parsers/environmentDocument';
import { isObject, isArray } from 'util';

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
    environment:Environment,
    isParent: boolean;
    iconPath?: string | Uri | { light: string | Uri; dark: string | Uri } | ThemeIcon;
    contextValue: string;
    refresh();
    prepare();
}

export interface IParentTreeNode extends ITreeNode {
    addChild(child:ITreeNode);
    removeChildren(remove:ITreeNode[]);
    clear();
    getChildren(): ITreeNode[] | Promise<ITreeNode[]>;
}

export interface IEnvironmentTreeNode extends ITreeNode {
    resourcePath: Uri;
    environment:Environment;
}

export class TreeNode implements ITreeNode {

    private _id:string;
    private _globalId:string;
    private _label:string;
    private _treeDataProvider:EnvironmentTreeDataProviderController;
    private _parent:ITreeNode;
    private _iconPath:string | Uri | { light: string | Uri; dark: string | Uri } | ThemeIcon;
    
    constructor(id:string, label?:string, iconPath?:ThemeIcon) {
        
        if(!iconPath) {
            iconPath = ThemeIcon.File;
        }
        
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

    public get environment():Environment {

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

    public get isParent():boolean {
        return false;
    }

    public get iconPath():string | Uri | { light: string | Uri; dark: string | Uri } | ThemeIcon {
        return this._iconPath;
    }

    public set iconPath(value:string | Uri | { light: string | Uri; dark: string | Uri } | ThemeIcon) {
        this._iconPath = value;
    }

    public get parent():ITreeNode {
        return this._parent;
    }

    public set parent(value:ITreeNode) {
        this._parent = value;
    }

    public get contextValue():string {
        return undefined;
    }

    public async prepare() {

    }

    public refresh() {
        this.treeDataProvider.refresh(this);
    }
}

export class ParentTreeNode extends TreeNode implements IParentTreeNode {

    private _children:ITreeNode[] = [];

    constructor(id:string, label?:string, iconPath?:ThemeIcon) {
        super(id, label)

        if(!iconPath) {
            iconPath = ThemeIcon.Folder;
        }

        this.iconPath = iconPath;
    }

    public get isParent():boolean {
        return true;
    }

    protected get children():ITreeNode[] {
        return this._children;
    }

    public clear() {
        this._children = [];
    }
    
    public addChild(child:ITreeNode) {

        let exists = this.children.find(n=> n.id === child.id);

        if(!exists) {
            child.parent = this;
            this._children.push(child);
        }
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

    public async getChildren(): Promise<ITreeNode[]> {
        await this.loadChildren();
        return this._children;
    }

    protected async loadChildren() {

    }
}

export class ObjectTreeNode extends ParentTreeNode {

    private _object:any;

    constructor(id:string, object:any, label?:string) {
        super(id, label);
        this._object = object;
    }

    public get isParent():boolean {
        return true;
    }

    protected get object():any {
        return this._object;
    }

    protected async loadChildren() {

        let children:ITreeNode[] = [];

        if(isArray(this.object)) {

            for(let key in this.object) {

                let value = this.object[key];
    
                if(isObject(value)) {
                    let child = new ObjectTreeNode(key, value);
                    child.iconPath = null;
                    this.addChild(child);
                } else {
                    let id = key + ': ' + value;

                    let child = new TreeNode(id,value);
                    child.iconPath = null;
                    this.addChild(child);
                }
            }

        } else {

            for(let key in this.object) {

                let value = this.object[key];
    
                if(isObject(value)) {
                    let child = new ObjectTreeNode(key, value);
                    child.iconPath = null;
                    this.addChild(child);
                } else {
                    let id = key + ': ' + value;
                    
                    let child = new TreeNode(id);
                    child.iconPath = null;
                    this.addChild(child);
                }
            }

        }
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

        EnvironmentManager.subscribe((eventName) => {
            if(eventName === 'environment.changed') {
                this.refresh();
            }
        });
    }

    protected async loadChildren() {
        
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

    private _online:boolean = undefined;
    private _environment:Environment;
    private _resourcePath:Uri;

    constructor(environment:Environment, resourcePath: vscode.Uri) {
        super(environment.id, environment.name);

        this._environment = environment;
        this._resourcePath = resourcePath;
    }

    public set online(value:boolean) {
        this._online = value;
    }

    public get online(): boolean {
        return this._online;
    }

    public get label():string {

        let current = EnvironmentManager.get().environment;
        let post =  '';

        if(!this.online) {
            post = ' (offline)';
        }

        if(current && current.id === this._environment.id) {
            return super.label + ' (x)' + post;
        } else {
            return super.label + post;;
        }
    }

    public set label(value:string) {
        super.label = value;
    }

    public get iconPath():string | Uri | { light: string | Uri; dark: string | Uri } | ThemeIcon {
        if(this.online) {
            return ThemeIcon.Folder;
        } else {
            return ThemeIcon.File;
        }
    }

    public set iconPath(value:string | Uri | { light: string | Uri; dark: string | Uri } | ThemeIcon) {
        super.iconPath = value;
    }

    public get isParent(): boolean {
        return this.online;
    }

    public set environment(environment:Environment) {
        
        this._environment = environment;
        this._online = undefined;
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

    public get contextValue(): string {
        return 'environment';
    }

    public async prepare() {

        let query = ElasticsearchQueryManager.createPingQuery();
        let response = await ElasticsearchQueryManager.executeQuery(query, this._environment);

        this.online = response.completed;
    }

    protected async loadChildren() {

        if(this.online) {
            this.addChild(new IndicesQueryTreeNode());
            this.addChild(new AliasesQueryTreeNode());
            this.addChild(new TemplatesQueryTreeNode());
        }
        
    }

}

abstract class QueryTreeNode extends ParentTreeNode {

    private _query:string;

    constructor(id:string, query:string) {
        super(id);

        this._query = query;
    }
    
    public get isParent():boolean {
        return true;
    }
    
    public get query():string {
        return this._query;
    }
    
    public set query(value:string) {
        this._query = value;
    }

    protected async loadChildren() {

        this.clear();
        let response = await this.executeQuery();
        let children = await this.getChildrenInResponse(response);
        children.forEach(child => this.addChild(child));

        this.children.sort((a, b) => a.label.localeCompare(b.label));
    }

    protected async executeQuery() : Promise<ElasticsearchResponse> {

        let query:ElasticsearchQuery = ElasticsearchQuery.parse(this._query);
        let response = await ElasticsearchQueryManager.executeQuery(query, this.environment);

        return response;
    }

    protected async getChildrenInResponse(response:ElasticsearchResponse):Promise<ITreeNode[]> {
        return [];
    }
}

export class IndicesQueryTreeNode extends QueryTreeNode {
    
    constructor() {
        super('indices','GET /_cat/indices');
    }

    protected async getChildrenInResponse(response:ElasticsearchResponse): Promise<ITreeNode[]> {

        let children:ITreeNode[] = [];

        if(response.completed) {

            for(let d of response.body) {
                children.push(new IndexTreeNode(d));
            }
        }

        return children;
    }

}

export class TemplatesQueryTreeNode extends QueryTreeNode {

    constructor() {
        super('templates','GET /_template');
    }

    protected async getChildrenInResponse(response:ElasticsearchResponse): Promise<ITreeNode[]> {

        let children:ITreeNode[] = [];

        if(response.completed) {

            let keys = Object.keys(response.body);

            for(let indexTemplateName of keys) {
                children.push(new IndexTemplateQueryTreeNode(indexTemplateName, indexTemplateName));
            }
        }

        return children;
    }

}

export class IndexTreeNode extends ParentTreeNode {
    
    private _index:any;

    constructor(index:any) {
        super(index.index);
    
        this._index = index;
    }

    public get contextValue(): string {
        return 'index';
    }

    protected async loadChildren() {

        this.addChild(new IndexMappingsQueryTreeNode('mappings', this._index.index))
        this.addChild(new AliasesQueryTreeNode('GET /'+ this._index.index +'/_alias/*', true));
        this.addChild(new IndexSettingsQueryTreeNode('settings', this._index.index))
        this.addChild(new IndexStatsQueryTreeNode('statistics', this._index.index))
    }
}

export class IndexTemplateQueryTreeNode extends QueryTreeNode {

    private _indexTemplateName:string

    constructor(id:string, indexTemplateName:string) {
        super(id, 'GET /_template/' + indexTemplateName);

        this._indexTemplateName = indexTemplateName;
    }

    public get contextValue():string {
        return 'indexTemplate';
    }

    protected async getChildrenInResponse(response:ElasticsearchResponse): Promise<ITreeNode[]> {

        let children:ITreeNode[] = [];

        if(response.completed) {

            if(response.body[this._indexTemplateName]) {

                let objectNode = new ObjectTreeNode('template', response.body[this._indexTemplateName]);
                let nodes = await objectNode.getChildren();
                nodes.forEach(child => children.push(child));
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

    protected async getChildrenInResponse(response:ElasticsearchResponse): Promise<ITreeNode[]> {

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

export class IndexMappingsQueryTreeNode extends QueryTreeNode {

    private _indexName:string

    constructor(id:string, indexName:string) {
        super(id, 'GET /' + indexName + '/_mapping');

        this._indexName = indexName;
    }

    protected async getChildrenInResponse(response:ElasticsearchResponse): Promise<ITreeNode[]> {

        let children:ITreeNode[] = [];

        if(response.completed) {

            if(response.body[this._indexName] &&  response.body[this._indexName].mappings) {

                let keys = Object.keys(response.body[this._indexName].mappings);
                for(let key of keys) {

                    let node = new ObjectTreeNode(key, response.body[this._indexName].mappings[key]);
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
                node.iconPath = undefined;
                node.parent = root;

                this.buildMappingTree(node, properties[key].fields);
                root.addChild(node);
            } else {
                let node = new TreeNode(label);
                node.iconPath = undefined;
                node.parent = root;

                root.addChild(node);
            }
        }

    }
}

export class IndexSettingsQueryTreeNode extends QueryTreeNode {

    private _indexName:string

    constructor(id:string, indexName:string) {
        super(id,'GET /' + indexName + '/_settings');

        this._indexName = indexName;
    }

    protected async getChildrenInResponse(response:ElasticsearchResponse): Promise<ITreeNode[]> {

        let children:ITreeNode[] = [];

        if(response.completed) {

            if(response.body[this._indexName] && response.body[this._indexName].settings) {

                var root = new ObjectTreeNode('settings', response.body[this._indexName].settings.index);
                let settings = await root.getChildren();
                settings.forEach(child => children.push(child));
            }

        }

        return children;
    }

}

export class IndexStatsQueryTreeNode extends QueryTreeNode {

    private _indexName:string

    constructor(id:string, indexName:string) {
        super(id,'GET /' + indexName + '/_stats');

        this._indexName = indexName;
    }

    protected async getChildrenInResponse(response:ElasticsearchResponse): Promise<ITreeNode[]> {

        let children:ITreeNode[] = [];

        if(response.completed) {

            if(response.body.indices[this._indexName]) {

                var root = new ObjectTreeNode('stats', response.body.indices[this._indexName]);
                let nodes = await root.getChildren();
                nodes.forEach(child => children.push(child));
            }

        }

        return children;
    }

}

