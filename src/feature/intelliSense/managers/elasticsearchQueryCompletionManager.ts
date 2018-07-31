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
import { IEndpoint } from '../models/IEndpoint';
import { LogManager } from '../../../managers/logManager';

var _queryCompletionManager:ElasticsearchQueryCompletionManager;

interface IRestApiEndpoints {
    get:Graph;
    put:Graph;
    delete:Graph;
    post:Graph;
    head:Graph
}

export class ElasticsearchQueryCompletionManager {
    
    private _endpoints:any;
    private _graphs:any;
    private _versionNumber:string

    constructor(versionNumber?:string) {
        this._graphs = {};
        this._endpoints = {};
        this._versionNumber = versionNumber;

        EnvironmentManager.subscribe((eventName) => {
            if(eventName === 'environment.changed') {

                this._versionNumber = null;
                this._endpoints = {};
                this._graphs = {};
                LogManager.info(false, 'cleared intellisense graphs and enpoints');
            }
        });

    }

    public get versionNumber():string {
        return this._versionNumber;
    }

    public get graphs():any {
        return this._graphs;
    }

    public getEndpointWithId(endpointId:string): IEndpoint {
        return this._endpoints[endpointId];
    }

    public getEndpointWith(method:string, command:string): IEndpoint {

        let endpoint:IEndpoint;
        let endpointId = this.getEndpointIdWith(method, command);
        endpoint = this.getEndpointWithId(endpointId);

        return endpoint;

    }

    public getEndpointIdWith(method:string, command:string): string {

        let endpointId:string;

        if(method && command) {

            command = command.toLowerCase();
            let graph = this.getGraphWithMethod(method);
            let steps = command.split('/').splice(1);

            let nodes = this.getNodesWithSteps(steps, null, graph, n=> n.label);
            let endpointNode = nodes.find(n=> n.data.kind === 'endpoint');
    
            if(endpointNode) {
                endpointId = endpointNode.id
            }
        }

        return endpointId;

    }

    public getEndpointIdWithQuery(query:ElasticsearchQuery):string {
        return this.getEndpointIdWith(query.method, query.command);
    }

    public getCompletionItems(query:ElasticsearchQuery, offset:number, triggerCharacter:string): vscode.CompletionItem[] {

        let completionItems:vscode.CompletionItem[] = [];
        let token = query.tokenAt(offset);
        
        if(token) {

            switch(token.type) {
                case TokenType.Command:
                    completionItems = this.getCompletionItemsForQueryCommand(query);
                    break;
                case TokenType.QueryString:
                    completionItems = this.getCompletionItemsForQueryString(query, token as PropertyToken, offset);
                    break;
                case TokenType.Body:
                    completionItems = this.getCompletionItemsForQueryBody(query, offset, triggerCharacter);
                    break;
            }

        } else {
            LogManager.warning(false, 'could not find any token at offset %s', offset);
        }

        return completionItems;
    }

    public getCompletionItemsForQueryCommand(query:ElasticsearchQuery): vscode.CompletionItem[] {

        let completionItems:vscode.CompletionItem[] = [];

        if(query.hasCommand) {

            let command = query.command.toLowerCase();
            let graph = this.getGraphWithMethod(query.method);
            let steps = command.split('/').splice(1);
            steps.pop();
            let roots:any[] = [];
            let visited:string[] = [];

            if(steps.length > 0) {
                let nodes = this.getNodesWithSteps(steps, null, graph, n=> n.label);

                for(let node of nodes) {
                    roots.push({ current:node, path: node.label, depth: 0 });
                }

            } else {
                let nodes = graph.getRootNodes();

                for(let node of nodes) {
                    roots.push({ current:node, path: node.label, depth: 0 });
                }
            }

            while(roots.length > 0) {

                let context = roots.pop();

                if(!visited.find(s => s === context.current.id)) {
                    
                    visited.push(context.current.id);
                    let edges = graph.getEdgesWithSourceId(context.current.id);
                
                    for(let edge of edges) {
                        let target = graph.getNodeWithId(edge.targetId);
                        let label = context.path;

                        if(target.data.kind === 'endpoint') {
                          
                            completionItems = completionItems.filter(c=> c.label !== label);
                            
                            let item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Method);
                            let snippet = this.createTextSnippet(label);
                            item.insertText = new vscode.SnippetString(snippet);
                            item.filterText = label.replace('{','').replace('}', '');

                            completionItems.push(item);
    
                        } else if(target.data.kind === 'step') {
    
                            if(context.depth === 0) {

                                let exists = completionItems.find(c=> c.label === label);
                                let children = graph.getEdgesWithSourceId(target.id);

                                if(!exists && children.length > 1) {
                                    
                                    let item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Folder);
                                    let snippet = this.createTextSnippet(label);
                                    item.insertText = new vscode.SnippetString(snippet);
                                    item.filterText = label.replace('{','').replace('}', '');
                                    
                                    completionItems.push(item);
                                }
                            }
    
                            roots.push({
                                current: target,
                                path: context.path + '/' + target.label,
                                depth: context.depth + 1
                            });
                        }
                    }

                }

            }
        }

        return completionItems;
    }

    public getCompletionItemsForQueryString(query:ElasticsearchQuery, token:PropertyToken, offset:number): vscode.CompletionItem[]  {

        let completionItems:vscode.CompletionItem[] = [];
        
        if(query.hasEndpointId) {
            let graph = this.getGraphWithMethod(query.method);

            if(token.hasText && token.propertyValueToken && token.propertyValueToken.isInRange(offset)) {

                let parameterId = query.endpointId + '/' + token.text;
                let node = graph.getNodeWithId(parameterId);

                if(node) {
                    
                    if(node.data.options) {
                        for(let option of node.data.options) {
                            let item = new vscode.CompletionItem(option, vscode.CompletionItemKind.Value);
                            completionItems.push(item);
                        }
                    } else if(node.data.type === 'boolean') {
                        completionItems.push(new vscode.CompletionItem('true', vscode.CompletionItemKind.Value));
                        completionItems.push(new vscode.CompletionItem('false', vscode.CompletionItemKind.Value));
                    }
                    
                } 

            } else {

                let nodes = graph.getOutgoingNodes(query.endpointId);

                for(let node of nodes) {
    
                    if(node.data.kind === 'parameter') {
                        
                        let item = new vscode.CompletionItem(node.label, vscode.CompletionItemKind.Field);
                        item.detail = 'type:' + node.data.type;
    
                        if(node.data.options) {
                            item.detail += ' options:[' + node.data.options.toString() + ']';
                        }
    
                        item.documentation =  node.data.description;
                        item.filterText = node.label.replace('{','').replace('}', '');
    
                        completionItems.push(item);
                    }
    
                }

            }
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

            let graph = this.getGraphWithEndpointId(query.endpointId);

            if(graph) {

                if(token.path) {
                    let steps = token.path.replace(/\[\w+\]/, '.[0]').split('.');
                    let root = graph.getNodeWithId(steps[0]);
                    let nodes = this.getNodesWithSteps(steps, root, graph, n => n.label);
                    completionItems = this.createCompletionItems(nodes, triggerCharacter);
        
                } else {
                    let children = graph.findNodes(n=> n.data.depth === 0);
                    children = children.filter(n=> !n.data.isTemplate);
                    completionItems = this.createCompletionItems(children, triggerCharacter);
                }

            }

        }

        return completionItems;
    }

    protected getGraphWithMethod(method:string): Graph {
        let key = 'method_' + method.toLowerCase();

        if(!this._graphs[key]) {
            this.loadEndpointGraphs();
        }

        return this._graphs[key];
    }

    protected getGraphWithEndpointId(endpointId:string): Graph {

        if(!this._graphs[endpointId]) {
            this.loadGraphWithEndpointId(endpointId);
        }

        return this._graphs[endpointId];
    }

    protected loadGraphWithEndpointId(endpointId:string) {

        let graph = new Graph();
        let files:string[] = this.getEndpointDslFiles(endpointId);

        for(let file of files) {

            const fileContent = fs.readFileSync(file, 'UTF-8');
            let source = JSON.parse(fileContent);
            let keys = Object.keys(source);
    
            for(let key of keys) {
                if(key.startsWith('__')) {
                    this.loadDslGraph(source[key], graph, 100);
                    delete source[key];
                }
            }
    
            this.loadDslGraph(source, graph);
        }

        let nodes = graph.getNodes();

        for(let node of nodes) {
            node.data.isDynamicNode = node.label.endsWith('}');
        }

        this._graphs[endpointId] = graph;
    }

    protected getChildrenNodesWithParentNodeId(node:Node, graph:Graph):Node[] {

        let edges = graph.getEdgesWithSourceId(node.id);
        let children:Node[] = [];

        while(edges.length > 0) {
            let edge = edges.pop();

            if(edge.kind === 'children_of') {
                let childrenOfEdges = graph.getEdgesWithSourceId(edge.targetId);
                childrenOfEdges.forEach(e => edges.push(e));
            } else {
                let child = graph.getNodeWithId(edge.targetId);
                children.push(child);
            }
        }

        return children;
    }

    public getNodesWithSteps(steps:string[], root:Node, graph:Graph, findNode: (node:Node) => string):Node[] {

        let children:Node[] = [];
        
        if(steps.length > 0 && steps[0].length > 0){
            
            if(!root) {
                let roots = graph.getRootNodes();
                root = roots.find(n=> findNode.call(n, n) === steps[0]);

                if(!root) {
                    root = roots.find(n=> n.data.isDynamicNode);
                }

            }

            let node = root;

            if(node) {

                for(let index = 0; index < steps.length; index++) {
        
                    let nextNodeId = steps[index + 1];
                    let isNotLastStep:boolean = index < steps.length - 1; 
                    
                    children = this.getChildrenNodesWithParentNodeId(node, graph);

                    if(isNotLastStep) {
                        node = children.find(n => findNode.call(n, n) === nextNodeId);
        
                        if(!node && nextNodeId.length > 0) {
                            node = children.find(n=> n.data.isDynamicNode);
        
                            if(!node) {
                                children = [];
                                break;
                            }
                        } else if(!node) {
                            children = [];
                            break;
                        }
    
                        steps[index + 1] = node.id;
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
            item.filterText = label.replace('{','').replace('}', '');

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

    private createTextSnippet(text:string):string {

        if(text && text.length > 0){

            let matches = text.match(/\{(\w+)\}/g);

            if(matches) {
    
                let index = 1;
    
                for(let m of matches) {
                    let key = m.substring(1, m.length - 1);
                    text = text.replace(m, '${' + index + ':' + key + '}');
                    index++;
                }
            }

        }

        return text;
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
        }

        
        return label;
    }

    private loadEndpointGraphs() {

        let files = this.getRestApiSpecificationFiles();
        
        for(let file of files) {

            const fileContent = fs.readFileSync(file, 'UTF-8');
            let source = JSON.parse(fileContent);
            let endpointId = Object.keys(source)[0];
            let endpoint:IEndpoint = source[endpointId];
            endpointId = 'endpoint_' + endpointId;
            this._endpoints[endpointId] = endpoint;

            if(endpoint.methods) {

                for(let method of endpoint.methods) {

                    let key = 'method_' + method.toLowerCase();

                    if(!this._graphs[key]) {
                        this._graphs[key] = new Graph();
                    }

                    let graph = this._graphs[key];

                    graph.addNode(endpointId, endpointId, { kind: 'endpoint' });

                    if(endpoint.url && endpoint.url.params) {
                        let parameterNames = Object.keys(endpoint.url.params);
        
                        for(let name of parameterNames) {
                            let parameter = endpoint.url.params[name];
                            let parameterId = endpointId + '/' + name;
                            graph.addNode(parameterId, name, { 
                                kind: 'parameter', 
                                ...parameter
                             });
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

                            graph.addNode(stepId, step, { kind: 'step' });

                            if(index == steps.length - 1) {
                                graph.addEdge(stepId, endpointId);
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

        let globalFiles = this.getRestApiGlobalSpecificationFiles();
        let graphNames = Object.keys(this._graphs);

        for(let file of globalFiles) {
            const fileContent = fs.readFileSync(file, 'UTF-8');
            let source = JSON.parse(fileContent);
            let parameterNames = Object.keys(source.params);

            for(let graphName of graphNames) {
                if(graphName.startsWith('method_')) {
                    let graph = this._graphs[graphName] as Graph;
                    let nodes = graph.findNodes(n=> n.data.kind === 'endpoint');
                
                    for(let node of nodes) {

                        for(let name of parameterNames) {
                            let parameter = source.params[name];
                            let parameterId = node.id + '/' + name;
                            graph.addNode(parameterId, name, { 
                                kind: 'parameter',
                                ...parameter
                             });
                            graph.addEdge(node.id, parameterId);
                        }
                    }
                }
            }
        }

        let keys = Object.keys(this._graphs);

        for(let key of keys) {

            if(key.startsWith('method_')) {

                let graph = this._graphs[key] as Graph;
                let nodes = graph.getNodes();
    
                for(let node of nodes) {
                    node.data.isDynamicNode = node.label.endsWith('}');
                }

            }
        }
    }

    private loadDslGraph(source, graph:Graph, startDepth:number = 0) {

        let stack:any[] = [];
        stack.push( { 
            source: source, 
            path: null,
            depth: startDepth});

        while(stack.length > 0) {
            let context = stack.pop();
            let source = context.source;
            let path = context.path;

            let keys = Object.keys(source);

            for(let key of keys) {
                let current = source[key];

                if(!key.startsWith('__')) {

                    let nodeId = path + '/' + key;
                    
                    if(path == null) {
                        nodeId = key;
                    }

                    if(isArray(current)) {
                        
                        let kind:vscode.CompletionItemKind = vscode.CompletionItemKind.Enum;

                        if(current.length > 0) {
                            if(isObject(current[0])) {
                                kind = vscode.CompletionItemKind.Reference;
                                let arrayObjectNodeId = nodeId +'/[0]';

                                graph.addNode(arrayObjectNodeId, '[0]', { 
                                    id: '[0]', 
                                    kind: vscode.CompletionItemKind.Struct, 
                                    depth: context.depth });

                                graph.addEdge(nodeId, arrayObjectNodeId);

                                stack.push({ source:current[0], path: arrayObjectNodeId, depth: context.depth + 1});
                            }
                        }
                        
                        graph.addNode(nodeId, key, { kind: kind, depth: context.depth});
                        graph.addEdge(path, nodeId);

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

                        graph.addNode(nodeId, key, { 
                            id: key, 
                            kind: kind, 
                            isTemplate:isTemplate, 
                            depth: context.depth 
                        });

                        graph.addEdge(path, nodeId);

                        stack.push({ source:current, path: nodeId, depth: context.depth + 1});

                    } else {

                        graph.addNode(nodeId, key, { 
                            id: key, 
                            kind: vscode.CompletionItemKind.Field, 
                            defaultValue: current, 
                            depth:context.depth 
                        });

                        graph.addEdge(path, nodeId);
                    }

                } else if(key === '__children_of') {
                    
                    if(isArray(current)) {

                        for(let c of current) {
                            graph.addEdge(path, c, null, 'children_of');
                        }
        
                    } else {
                        graph.addEdge(path, current, null, 'children_of');
                    }
                }
            }
        }
    }

    private getVersionNumber() {

        let versionNumber:string = null;

        if(this._versionNumber) {
            versionNumber = this._versionNumber;
        } else {
            let environment = EnvironmentManager.get().environment;

            let extension = vscode.extensions.getExtension(constant.ExtensionId);
            let folderPath =  extension.extensionPath +  '\\resources';

            let folders = fs.readdirSync(folderPath)
                .filter(
                    f=> fs.statSync(path.join(folderPath, f)).isDirectory()
                );

            if(environment && environment.hasVersion) {

                let closestVersion = Version.getClosest(environment.version, folders);
    
                if(closestVersion) {
                    versionNumber = closestVersion.toString();
                }

            } else if(environment) {
                LogManager.warning(false, 'failed getting version from environment %s', environment);
                
                let version = Version.parse(constant.DefaultVersion);
                LogManager.warning(false, 'using default version %s', version);

                let closestVersion = Version.getClosest(version, folders);
    
                if(closestVersion) {
                    versionNumber = closestVersion.toString();
                }
            }

        }

        if(!versionNumber) {
            LogManager.warning(false, 'failed getting versionNumber');
        } else {
            this._versionNumber = versionNumber;
        }

        return versionNumber;
    }

    private getEndpointDslFiles(endpointId:string) {

        if(endpointId.startsWith('endpoint_')) {
            endpointId = endpointId.replace('endpoint_', '');
        }

        let extension = vscode.extensions.getExtension(constant.ExtensionId);
        let versionNumber = this.getVersionNumber();
        let folderPath =  path.join(extension.extensionPath, 'resources', versionNumber, 'endpoints', endpointId);

        return this.getFilesWithFolderPath(folderPath);
    }

    private getRestApiGlobalSpecificationFiles():string[] {

        let extension = vscode.extensions.getExtension(constant.ExtensionId);
        let versionNumber = this.getVersionNumber();
        let folderPath =  path.join(extension.extensionPath, 'resources', versionNumber, 'rest-api-spec');
        let files:string[] = this.getFilesWithFolderPath(folderPath)
                                        .filter(f=> f.endsWith('_common.json'))

        return files;
    }

    private getRestApiSpecificationFiles():string[] {

        let files:string[] = [];
        let extension = vscode.extensions.getExtension(constant.ExtensionId);
        let versionNumber = this.getVersionNumber();

        if(versionNumber) {

            LogManager.verbose('loading rest-api-spec for version %s', versionNumber);

            let folderPath =  path.join(extension.extensionPath, 'resources', versionNumber, 'rest-api-spec');
            files = this.getFilesWithFolderPath(folderPath)
                                            .filter(f=> !f.endsWith('_common.json'))

        }

        return files;
    }

    private getFilesWithFolderPath(folderPath:string, filterWithPrefix:string='', filterWithExtension:string = '.json') {

        let jsonFiles:string[] = [];

        if(fs.existsSync(folderPath)) {

            let files = fs.readdirSync(folderPath);

            for(let file of files) {
                const extension = path.extname(file);
    
                if(file.startsWith(filterWithPrefix)) {
    
                    if(extension === filterWithExtension) {
                        jsonFiles.push( 
                            path.join(folderPath, file)
                        );
                    }
                }
            }
        }

        return jsonFiles;
    }

    public static get(): ElasticsearchQueryCompletionManager {

    
        if(!_queryCompletionManager) {
            _queryCompletionManager = new ElasticsearchQueryCompletionManager();
        }
    
        return _queryCompletionManager;
    
    }
}
