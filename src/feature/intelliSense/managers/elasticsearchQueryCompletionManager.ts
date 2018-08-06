'use strict'

import * as vscode from 'vscode';
import * as constant from '../../../constant';
import * as fs from 'fs';
import * as path from 'path'

import { ElasticsearchQuery } from "../../../models/elasticSearchQuery";
import { TokenType } from "../../../parsers/elasticsearchQueryDocumentScanner";
import { EntityDocumentScanner, TokenType as EntityTokenType } from "../../../parsers/entityDocumentScanner";
import { Graph, Node, Edge } from "../../../models/graph";
import { EnvironmentManager } from '../../../managers/environmentManager';
import { Version } from '../../../models/version';
import { isObject, isArray } from 'util';
import { PropertyToken } from '../../../models/propertyToken';
import { IEndpoint } from '../models/iendpoint';
import { LogManager } from '../../../managers/logManager';

var _queryCompletionManager:ElasticsearchQueryCompletionManager;

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

    public getCompletionItems(query:ElasticsearchQuery, offset:number, triggerCharacter:string, textDocument: vscode.TextDocument): vscode.CompletionItem[] {

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
                    completionItems = this.getCompletionItemsForQueryBody(query, offset, triggerCharacter, textDocument);
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

    public getCompletionItemsForQueryBody(query:ElasticsearchQuery, offset:number, triggerCharacter:string, textDocument: vscode.TextDocument): vscode.CompletionItem[] {

        let completionItems:vscode.CompletionItem[] = [];
        let bodyToken = query.tokenAt(offset);
        let offsetInBody = offset - bodyToken.offset;
        let body = bodyToken.text.substr(0, offsetInBody + 1);
        let entityDocumentScanner = new EntityDocumentScanner(body);
        let token = entityDocumentScanner.scanUntilPosition(offsetInBody) as PropertyToken;
        let tokens = entityDocumentScanner.store;
        
        if(token) {
            let graph = this.getGraphWithEndpointId(query.endpointId);

            if(graph) {

                let nodeSteps:string[] = ['root'];
                let tokenSteps:string[] = [];
                let tokenPath = token.path;

                if(tokenPath) {
                    tokenPath = tokenPath.replace('[', '.[');
                    tokenSteps = tokenPath.split('.')                   
                            .filter(s => s !== '');

                    tokenPath.replace(/\[\w+\]/, '.[0]')
                            .split('.')
                            .filter(s => s !== '')
                            .forEach(s=> nodeSteps.push(s));
                }
                
                let node:Node = undefined;
                let visited:Edge[] = [];

                let getNode:((step:string, edges:Edge[], visited:Edge[], graph:Graph)=> Node)[] = [];
                getNode.push(
                    (step, edges, visited, graph) => {

                        for(let edge of edges) {
                            let n = graph.getNodeWithId(edge.targetId);
                            
                            if(n.label === step) {
                                visited.push(edge);
                                return n;
                            }
                        }
                    }
                );

                getNode.push(
                    (step, edges, visited, graph) => {

                        for(let edge of edges) {
                            let n = graph.getNodeWithId(edge.targetId);
                            
                            if(n.data.isDynamicNode) {
                                visited.push(edge);
                                return n;
                            }
                        }
                    }
                );

                for(let depth = 0; depth < nodeSteps.length; depth++) {
                    let step = nodeSteps[depth];
                    let path = undefined;
                    let foundNextNode = false;

                    if(depth > 0) {
                        for(let index = 0; index < depth; index++) {
                            if(path) {
                                if(tokenSteps[index].startsWith('[')) {
                                    path += tokenSteps[index];
                                } else {
                                    path += '.' + tokenSteps[index];
                                }
                            } else {
                                path = tokenSteps[index];
                            }
                        }
                    }

                    if(node) {
                        let currentTokenAtThisDepth = tokens.find(t=> t.path == path);
                        let tokenType = currentTokenAtThisDepth.propertyValueToken ? currentTokenAtThisDepth.propertyValueToken.type: currentTokenAtThisDepth.type;
                        let edges:Edge[] = [];

                        if(tokenType === EntityTokenType.PropertyValue) {
                            edges = graph.findEdges(e=> e.sourceId == node.id && (
                                e.kind !== 'array' && e.kind !== 'object' && e.kind !== 'children_of'));

                        } else if(tokenType === EntityTokenType.OpenEntity) {
                            edges = graph.findEdges(e=> e.sourceId == node.id && e.kind === 'object');
                        } else if(tokenType === EntityTokenType.OpenArray) {
                            edges = graph.findEdges(e=> e.sourceId == node.id && e.kind === 'array');
                        }

                        for(let fn of getNode) {
                            node = fn.call(this, step, edges, visited, graph);

                            if(node) {
                                foundNextNode = true
                                break;
                            }
                        }

                    } else {
                        node = graph.findNode(n=> n.label == step);
                        foundNextNode = node != null;
                    }

                    if(!foundNextNode) {
                        node = null;
                        break;
                    }
                }

                if(node) {
                    
                    let context:Edge;

                    if(visited.length > 0) {
                        context = visited[visited.length - 1];
                    }
                    
                    let edges = graph.findEdges(e=> e.sourceId == node.id && e.kind != 'children_of');

                    while(edges.length > 0) {
                        let edge = edges.pop();
                        let target = graph.getNodeWithId(edge.targetId);
                        let label = target.label;
                        let hasLabel:boolean = true;
                        let kind:string = edge.kind;
                        let propertyPath = token.path + '.' + target.label;

                        if(!token.path) {
                            propertyPath = target.label;
                        }

                        let targetToken = tokens.find(c=> c.path === propertyPath);

                        if(targetToken) {
                            
                            if(kind === 'string' && targetToken.propertyValueToken) {
                            
                                let edgesBasedOnContext = graph.getEdgesWithSourceId(edge.targetId);
    
                                for(let e of edgesBasedOnContext) {
                                    let contextNode = graph.getNodeWithId(e.targetId);
    
                                    if(contextNode.label == targetToken.propertyValueToken.text) {
                                        graph.getEdgesWithSourceId(contextNode.id).forEach(c=> edges.push(c));
                                        break;
                                    }
                                }
                            }

                        }

                        if(!targetToken) {

                            let pattern = '"{label}": {value}';

                            if((token.hasText && !token.propertyValueToken) && target.label !== token.text) {
                                continue;
                            } else if(token.hasText && token.propertyValueToken && token.propertyValueToken.type === EntityTokenType.PropertyValue) {
                                pattern = '{value}';
                                hasLabel = false;
                                kind = context.kind;
                            } else if(token.hasText && token.propertyValueToken && 
                                    (   
                                        token.propertyValueToken.type === EntityTokenType.OpenArray || 
                                        token.propertyValueToken.type === EntityTokenType.BetweenArrayValue
                                    )) 
                            {
                                pattern = '{value}';
                                hasLabel = false;
                                label = edge.kind + ' value';
                            } else {
                                pattern = pattern.replace('{label}', label);
                            }
    
                            let item:vscode.CompletionItem = new vscode.CompletionItem(label);
                            item.filterText = label.replace('{','').replace('}', '');
                            item.detail = kind;
    
                            switch(kind) {
    
                                case 'object':
                                    item.kind = vscode.CompletionItemKind.Module;
                                    pattern = pattern.replace('{value}', '{$0}');
                                    break;
                                case 'array':
                                    item.kind = vscode.CompletionItemKind.Enum;
                                    pattern = pattern.replace('{value}', '[$0]');
                                    break;
                                case 'number':
                                case 'boolean':
    
                                    if(target.data.defaultValue !== undefined) {
                                        pattern = pattern.replace('{value}', ' {' + target.data.defaultValue + '}$0');
                                    } else {
                                        pattern = pattern.replace('{value}', '$0');
                                    }
                                    
                                    break;
                                default:
    
                                    if(!hasLabel && token.propertyValueToken) {
    
                                        item.kind = vscode.CompletionItemKind.EnumMember;
    
                                        if(token.propertyValueToken.type === EntityTokenType.OpenArray || 
                                            token.propertyValueToken.type === EntityTokenType.BetweenArrayValue) {
    
                                            if(target.data.defaultValue !== undefined) {
                                                pattern = pattern.replace('{value}', '"{'+ target.data.defaultValue +'}"$0');
                                            } else {
                                                pattern = pattern.replace('{value}', '"$2"$0');
                                            }
                                            
    
                                        } else if(!token.propertyValueToken.isValid) {
                                            pattern = pattern.replace('{value}', target.label + '"$0');    
                                        } else if(!target.data.isDynamicNode) {
                                            pattern = null;
                                        } 
    
                                    } else {
                                        if(target.data.defaultValue !== undefined) {
                                            pattern = pattern.replace('{value}', '"{'+ target.data.defaultValue +'}"$0');
                                        } else {
                                            pattern = pattern.replace('{value}', '"$2"$0');
                                        }
                                    }
                                    break;
    
                            }
    
                            if(pattern) {
                                pattern = this.createTextSnippet(pattern);
                                item.insertText = new vscode.SnippetString(pattern);
                            }
                            
                            completionItems.push(item);

                        }
                    }
                
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

        this.loadGraphWithEndpointId(endpointId);

        if(!this._graphs[endpointId]) {
            this.loadGraphWithEndpointId(endpointId);
        }

        return this._graphs[endpointId];
    }

    protected loadGraphWithEndpointId(endpointId:string) {

        let graph = new Graph();
        let files:string[] =[];
        let imported:string[] = [];
        let endpointFile = this.getEndpointFile(endpointId);

        if(endpointFile) {
            files.push(endpointFile);

            while(files.length > 0){
                let file = files.pop();
                
                if(!imported.find(f=> f === file)) {
                    imported.push(file);

                    const fileContent = fs.readFileSync(file, 'UTF-8');
                    let source = JSON.parse(fileContent);
                    let keys = Object.keys(source);

                    for(let key of keys) {
                        if(key === ("__import_file")) {
                            
                            if(isArray(source[key])) {
                                for(let importFile of source[key]) {
                                    importFile = this.getEndpointFile(importFile);

                                    if(importFile) {
                                        files.push(importFile);
                                    }
                                }
                            }

                        } else if(key.startsWith('__')) {
                            if(key !== '__inactive') {
                                this.loadDslGraph(source[key], graph, 100);
                            }
                            delete source[key];
                        }
                    }

                    this.loadDslGraph(source, graph);
                }
            }

            let nodes = graph.getNodes();
            graph.addNode('root', 'root', { depth:-1, types:["object"]});

            for(let node of nodes) {
                node.data.isDynamicNode = node.label.endsWith('}');

                if(node.data.depth === 0) {
                    node.data.types.forEach(t=> graph.addEdge('root', node.id, null, t));
                }
            }

            let edges = graph.findEdges(edge=> edge.kind === 'children_of');

            for(let edge of edges) {
                let children = graph.getOutgoingNodes(edge.targetId);
                let source = graph.getNodeWithId(edge.sourceId);

                for(let child of children) {
                    
                    child.data.types.forEach(t=>
                        graph.addEdge(edge.sourceId, child.id, null, t)
                    );

                    /*
                    source.data.types.forEach(t=>
                        graph.addEdge(edge.sourceId, child.id, null, t)
                    );*/
                }
            }

            this._graphs[endpointId] = graph;
        }
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

    private createTextSnippet(text:string):string {

        if(text && text.length > 0){

            let matches = text.match(/\{([\w| ]+)\}/g);

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
            types: [],
            depth: startDepth
        });

        while(stack.length > 0) {
            let context = stack.pop();
            let source = context.source;
            let path = context.path;

            if(isObject(source)) {

                let keys = Object.keys(source);

                for(let key of keys) {
                    let current = source[key];
                    let types:string[] = []
    
                    if(!key.startsWith('__')) {
    
                        let nodeId = path + '/' + key;
                        
                        if(path == null) {
                            nodeId = key;
                        }
    
                        if(isArray(current)) {
                            
                            if(current.length > 0) {
                                
                                for(let index = 0; index < current.length;index++) {
                                    let arrayEntry =  current[index];
                                    let arrayEntryTypes:string[] = []
                                    let id = '['+ index +']';
                                    let arrayEntryNodeId = nodeId +'/['+ index +']';
                                    let depth = context.depth + 1;

                                    if(isObject(arrayEntry)) {

                                        let arrayEntryType = 'object';
                            
                                        if(arrayEntry.__as_type) {
            
                                            if(isArray(arrayEntry.__as_type)) {
                                                arrayEntry.__as_type.forEach(t=> arrayEntryTypes.push(t));
                                            } else {
                                                arrayEntryTypes.push(arrayEntry.__as_type);
                                            }

                                        } else {
                                            arrayEntryTypes.push(arrayEntryType);
                                        }

                                        graph.addNode(arrayEntryNodeId, '[0]', { 
                                            id: id,
                                            types: arrayEntryTypes,
                                            depth: depth
                                        });

                                        arrayEntryTypes.forEach(t=> 
                                            graph.addEdge(nodeId, arrayEntryNodeId, null, t)
                                        );

                                        stack.push({ source:arrayEntry, path: arrayEntryNodeId, depth: depth});

                                    } else {
                                        let type = typeof(arrayEntry);

                                        graph.addNode(arrayEntryNodeId, '[0]', { 
                                            id: id,
                                            types: [type],
                                            defaultValue: arrayEntry.toString(),
                                            depth: depth
                                        });

                                        graph.addEdge(nodeId, arrayEntryNodeId, null, type);
                                    }
                                }
                            }
                            
                            graph.addNode(nodeId, key, { types: ['array'], depth: context.depth});
                            graph.addEdge(path, nodeId, null, 'array');
                            
    
                        } else if(isObject(current)) {
    
                            let type = 'object';
                            
                            if(current.__as_type) {

                                if(isArray(current.__as_type)) {
                                    current.__as_type.forEach(t=> types.push(t));
                                } else {
                                    types.push(current.__as_type);
                                }
                            } else {
                                types.push(type);
                            }
    
                            graph.addNode(nodeId, key, { 
                                id: key,
                                types: types,
                                depth: context.depth 
                            });
    
                            types.forEach(t=> 
                                graph.addEdge(path, nodeId, null, t)
                            );

                            stack.push({ source:current, path: nodeId, types: types, depth: context.depth + 1})
    
                        } else {
    
                            let type = typeof(current);
                            types.push(type);

                            graph.addNode(nodeId, key, { 
                                id: key, 
                                defaultValue: current.toString(),
                                types: types,
                                depth:context.depth 
                            });
    
                            types.forEach(t=> 
                                graph.addEdge(path, nodeId, null, type)
                            );

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
            } else {
                console.log('is not an object...');
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

    private getEndpointFile(endpointId:string):string {

        if(endpointId.startsWith('endpoint_')) {
            endpointId = endpointId.replace('endpoint_', '');
        }

        let extension = vscode.extensions.getExtension(constant.ExtensionId);
        let versionNumber = this.getVersionNumber();
        let file =  path.join(extension.extensionPath, 'resources', versionNumber, 'endpoints', endpointId + '.json');

        if(!fs.existsSync(file)) {
            file = null;
        }

        return file;
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
