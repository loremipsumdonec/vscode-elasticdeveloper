'use strict'

import * as vscode from 'vscode';
import * as constant from '../../../constant';
import * as urlhelper from '../../../helpers/url';
import * as fs from 'fs';
import * as path from 'path'

import { ElasticsearchQuery } from "../../../models/elasticSearchQuery";
import { TokenType } from "../../../parsers/elasticsearchQueryDocumentScanner";
import { EntityDocumentScanner } from "../../../parsers/entityDocumentScanner";
import { Graph, Node } from "../../../models/graph";
import { EnvironmentManager } from '../../../managers/environmentManager';
import { Version } from '../../../models/version';
import { isObject, isArray } from 'util';
import { PropertyToken } from '../../../models/propertyToken';
import { GephiStreamService } from '../../gephi/services/gephiStreamService';

var _queryCompletionManager:ElasticsearchQueryCompletionManager;

interface IRestApiEndpoints {
    get:Graph;
    put:Graph;
    delete:Graph;
    post:Graph;
    head:Graph
}

export class ElasticsearchQueryCompletionManager {
    
    private _bodyGraph:Graph;
    private _restApiEndpointGraph:IRestApiEndpoints;
    private _versionNumber:string

    constructor(versionNumber?:string) {
        this._versionNumber = versionNumber;
    }

    public getCompletionItems(query:ElasticsearchQuery, offset:number, triggerCharacter:string): vscode.CompletionItem[] {

        let completionItems:vscode.CompletionItem[] = [];

        let token = query.tokenAt(offset);

        switch(token.type) {
            case TokenType.Command:
                completionItems = this.getCompletionItemsForQueryCommand(query);
                break;
            case TokenType.Body:
                completionItems = this.getCompletionItemsForQueryBody(query, offset, triggerCharacter);
                break;
        }

        return completionItems;
    }

    public getCompletionItemsForQueryCommand(query:ElasticsearchQuery): vscode.CompletionItem[] {

        let completionItems:vscode.CompletionItem[] = [];

        if(query.hasCommand) {
            this.initRestApiEndpointGraphFromFiles();

            let graph = this._restApiEndpointGraph[query.method.toLowerCase()];
            let endpoints = graph.getNodes().filter(n=> n.data.kind === 'endpoint');
            let nodes:Node[] = [];

            for(let endpoint of endpoints) {
                let edges = graph.getEdgesWithTargetId(endpoint.id);

                for(let edge of edges) {
                    let node = graph.getNodeWithId(edge.sourceId);
                    nodes.push(node);
                }
            }

            completionItems = this.createCompletionItems(nodes, '"');
       
        }

        return completionItems;
    }

    public getCompletionItemsForQueryBody(query:ElasticsearchQuery, offset:number, triggerCharacter:string): vscode.CompletionItem[] {

        let completionItems:vscode.CompletionItem[] = [];

        let bodyToken = query.tokenAt(offset);
        let offsetInBody = offset - bodyToken.offset;

        let entityDocumentScanner = new EntityDocumentScanner(bodyToken.text.substr(0, offsetInBody));
        let token = entityDocumentScanner.scanUntilPosition(offsetInBody) as PropertyToken;
        
        if(!triggerCharacter && token.propertyValueToken.text != null && token.propertyValueToken.text.length == 0) {
            triggerCharacter = '"';
        }

        if(token) {
            console.log('Found body token att offset %s with path %s and token type %s', offset, token.path, token.type);
            this.initBodyGraphFromFiles();

            if(token.path) {

                let steps = token.path.replace(/\[\w+\]/, '.[0]').split('.');
                let nodes = this.getNodesWithSteps(steps, this._bodyGraph);
                completionItems = this.createCompletionItems(nodes, triggerCharacter);
    
            } else {
                let children = this._bodyGraph.getRootNodes();
                children = children.filter(n=> !n.data.isTemplate);
                completionItems = this.createCompletionItems(children, triggerCharacter);
            }

        }

        return completionItems;
    }

    public getNodesWithSteps(steps:string[], graph:Graph):Node[] {

        let children:Node[];
        
        if(steps.length > 0 && steps[0].length > 0){
            
            let roots = graph.getRootNodes();
            let node = roots.find(n=> n.id === steps[0]);

            if(!node) {
                node = roots.find(n=> n.data.isDynamicNode);
            }

            for(let index = 0; index < steps.length; index++) {
        
                let nextNodeId = steps[index + 1];
                let isNotLastStep:boolean = index < steps.length - 1; 
                
                children = graph.getOutgoingNodes(node.id);
                
                if(isNotLastStep) {
                    node = children.find(n=> n.id === nextNodeId);
    
                    if(!node) {
                        node = children.find(n=> n.data.isDynamicNode);
    
                        if(node) {
                            steps[index + 1] = node.id;
                        } else {
                            console.warn('Could not find a children node with label %s', nextNodeId)
                            break;
                        }
                    }
                }
            }

        }

        return children;
    }

    private createCompletionItems(nodes:Node[], triggerCharacter:string): vscode.CompletionItem[] {

        let completionItems:vscode.CompletionItem[] = [];

        for(let node of nodes) {

            let label:string = node.data.label;

            if(!label) {
                label = node.label;
            }

            let item = new vscode.CompletionItem(label, node.data.kind);
            let snippet:string =  this.getCompletionItemSnippet(node, triggerCharacter);            

            switch(item.kind) {
                case vscode.CompletionItemKind.Class:
                    item.insertText = new vscode.SnippetString(snippet + ': {$0\n}');
                    break;
                case vscode.CompletionItemKind.Enum:
                    item.insertText = new vscode.SnippetString(snippet +': ["${0}"]');
                    break;
                case vscode.CompletionItemKind.Reference:
                    item.insertText = new vscode.SnippetString(snippet +': [{${0}\n}]');
                    break;
                case vscode.CompletionItemKind.Field:
                    if(node.data.defaultValue) {
                        let defaultValue = node.data.defaultValue.toString().replace('{','').replace('}', '');
                        item.insertText = new vscode.SnippetString(snippet +': "${2:' + defaultValue + '}"$0');
                    } else {
                        item.insertText = new vscode.SnippetString(snippet +': "${2}"$0');
                    }
                    break;
                case vscode.CompletionItemKind.Value:
                    item.insertText = new vscode.SnippetString(snippet);
                    break;
                case vscode.CompletionItemKind.Struct:
                    item.insertText = new vscode.SnippetString('[{$0\n\t}]');
                    break;
                case vscode.CompletionItemKind.Method:
                    item.insertText = new vscode.SnippetString(snippet);
                    break;
            }

            completionItems.push(item);
        }

        return completionItems;
    }

    private getCompletionItemSnippet(node:Node, triggerCharacter:string):string {

        let label:string = node.data.label;

        if(!label) {
            label = node.label;
        }

        if(triggerCharacter !== '"') {
            label = '"'+ label +'"';
        }

        try{

            let matches = label.match(/\{(\w+)\}/g);

            if(matches) {
    
                let index = 1;
    
                for(let m of matches) {
                    let key = m.substring(1, m.length - 1);
                    label = label.replace(m, '${' + index + ':' + key + '}');
                    index++;
                }
            }
    

        }catch(ex) {
            console.log(ex);
        }

        
        return label;
    }

    private initBodyGraphFromFiles() {

        if(this._bodyGraph) {
            return;
        }

        let gephiService = new GephiStreamService();

        this._bodyGraph = new Graph();
        let file:string = this.getQueryDslFile();

        const fileContent = fs.readFileSync(file, 'UTF-8');
        let source = JSON.parse(fileContent);
        let keys = Object.keys(source);

        for(let key of keys) {
            if(key.startsWith('__')) {
                this.buildBodyGraph(source[key]);
                delete source[key];
            }
        }

        this.buildBodyGraph(source);

        let nodes = this._bodyGraph.getNodes();
        for(let node of nodes) {
            node.data.isDynamicNode = node.label.endsWith('}');
        }

        gephiService.syncGraph(this._bodyGraph);
    }

    private buildBodyGraph(source:any, path?:string) {

        if(isObject(source)) {
            
            let keys = Object.keys(source);

            for(let key of keys) {
                let current = source[key];

                if(!key.startsWith('__')) {

                    let nodeId = path + '.' + key;
                    
                    if(path == null) {
                        nodeId = key;
                    }
                    
                    if(isArray(current)) {
                        
                        let kind:vscode.CompletionItemKind = vscode.CompletionItemKind.Enum;

                        if(current.length > 0) {
                            if(isObject(current[0])) {
                                kind = vscode.CompletionItemKind.Reference;
                                let arrayObjectNodeId = nodeId +'.[0]';

                                this._bodyGraph.addNode(arrayObjectNodeId, '[0]', { id: '[0]', kind: vscode.CompletionItemKind.Struct });
                                this._bodyGraph.addEdge(nodeId, arrayObjectNodeId);
                                this.buildBodyGraph(current[0], arrayObjectNodeId);
                            }
                        }
                        
                        this._bodyGraph.addNode(nodeId, key, { kind: kind});
                        this._bodyGraph.addEdge(path, nodeId);

                    } else if(isObject(current)) {

                        let isTemplate = false;
                        let kind:vscode.CompletionItemKind = vscode.CompletionItemKind.Class;

                        if(current.__is_template) {
                            isTemplate = true;
                        }

                        if(current.__is_field) {
                            kind = vscode.CompletionItemKind.Field;
                        } else if(current.__is_value) {
                            kind = vscode.CompletionItemKind.Value;
                        }

                        this._bodyGraph.addNode(nodeId, key, { id: key, kind: kind, isTemplate:isTemplate });

                        this._bodyGraph.addEdge(path, nodeId);
                        this.buildBodyGraph(current, nodeId);

                    } else {

                        this._bodyGraph.addNode(nodeId, key, { id: key, kind: vscode.CompletionItemKind.Field, defaultValue: current });
                        this._bodyGraph.addEdge(path, nodeId);
                    }

                } else if(key === '__children_of') {
                    let childrenOf = current;

                    if(isArray(childrenOf)) {

                    } else {

                        let children = this._bodyGraph.getOutgoingNodes(childrenOf);

                        for(let child of children) {
                            this._bodyGraph.addEdge(path, child.id);
                        }
                    }
                }
            }
        }
    }

    private initRestApiEndpointGraphFromFiles() {

        if(this._restApiEndpointGraph) {
           return; 
        }

        let gephiService = new GephiStreamService();
        this._restApiEndpointGraph = {
            get: new Graph,
            delete: new Graph,
            put: new Graph,
            head: new Graph,
            post: new Graph
        };

        let files = this.getRestApiSpecificationFiles();
        
        for(let file of files) {

            const fileContent = fs.readFileSync(file, 'UTF-8');
            let source = JSON.parse(fileContent);
            let endpointId = Object.keys(source)[0];
            let endpoint = source[endpointId];

            if(endpoint.methods) {

                for(let method of endpoint.methods) {

                    method = method.toLowerCase();
                    let graph = this._restApiEndpointGraph[method];

                    graph.addNode(endpointId, endpointId, { kind: 'endpoint' });

                    if(endpoint.url && endpoint.url.params) {
                        let parameterNames = Object.keys(endpoint.url.params);
        
                        for(let name of parameterNames) {
                            let parameter = endpoint.url.params[name];
                            let parameterId = name;
                            graph.addNode(parameterId, name, { kind: 'parameter', description: parameter.description });
                            graph.addEdge(endpointId, parameterId);
                        }
        
                    }

                    for(let path of endpoint.url.paths) {
                        let steps:string[] = path.split('/').splice(1);
                        let previousStepId:string = null;

                        for(let index = 0; index < steps.length; index++) {
                            let step = steps[index];
                            let stepId = step;
                            
                            if(stepId.length == 0 && steps.length == 1) {
                                stepId = '/';
                                step = '/';
                            }

                            if(previousStepId) {
                                stepId = previousStepId + '/'+ step;
                            }

                            if(index == steps.length - 1) {
                                graph.addNode(stepId, step, { label: stepId, kind: vscode.CompletionItemKind.Method });
                                graph.addEdge(stepId, endpointId);
                            } else {
                                graph.addNode(stepId, step, { label: stepId, kind: 'step' });
                            }

                            if(previousStepId) {
                                graph.addEdge(previousStepId, stepId);
                            }

                            previousStepId = stepId;
                        }
                    }
                }
            }
        }

        let keys = Object.keys(this._restApiEndpointGraph);

        for(let key of keys) {
            let graph = this._restApiEndpointGraph[key] as Graph;

            let nodes = graph.getNodes();

            for(let node of nodes) {
                node.data.isDynamicNode = node.label.endsWith('}');
            }
        }

        gephiService.syncGraph(this._restApiEndpointGraph.get);
    }

    private getVersionNumber() {

        let versionNumber:string = null;

        if(this._versionNumber) {
            versionNumber = this._versionNumber;
        } else {
            let environment = EnvironmentManager.get().environment;

            if(environment && environment.hasVersion) {

                let extension = vscode.extensions.getExtension(constant.ExtensionId);
                let folderPath =  extension.extensionPath +  '\\resources';
    
                let folders = fs.readdirSync(folderPath)
                    .filter(
                        f=> fs.statSync(path.join(folderPath, f)).isDirectory()
                    );
    
                let closestVersion = Version.getClosest(environment.version, folders);
    
                if(closestVersion) {
                    versionNumber = closestVersion.toString();
                }
            }

        }

        return versionNumber;
    }

    private getQueryDslFile():string {

        let extension = vscode.extensions.getExtension(constant.ExtensionId);
        let versionNumber = this.getVersionNumber();
        let folderPath =  path.join(extension.extensionPath, 'resources', versionNumber, 'query-dsl', 'query.json');

        return folderPath;
    }

    private getRestApiSpecificationFiles():string[] {

        let specificationFiles:string[] = [];

        let extension = vscode.extensions.getExtension(constant.ExtensionId);
        let versionNumber = this.getVersionNumber();
        let folderPath =  path.join(extension.extensionPath, 'resources', versionNumber, 'rest-api-spec');
        let files = fs.readdirSync(folderPath);

        for(let file of files) {
            const extension = path.extname(file);

            if(extension === '.json') {
                specificationFiles.push( 
                    path.join(folderPath, file)
                );
            }
        }

        return specificationFiles;
    }

    public static get(): ElasticsearchQueryCompletionManager {

    
        if(!_queryCompletionManager) {
            _queryCompletionManager = new ElasticsearchQueryCompletionManager();
        }
    
        return _queryCompletionManager;
    
    }
}
