'use strict'

import * as vscode from 'vscode';

import { ElasticsearchQuery } from "../../../models/elasticSearchQuery";
import { TokenType } from "../../../parsers/elasticsearchQueryDocumentScanner";
import { EntityDocumentScanner, TokenType as EntityTokenType } from "../../../parsers/entityDocumentScanner";
import { Graph, Node, Edge } from "../../../models/graph";
import { PropertyToken } from '../../../models/propertyToken';
import { IEndpoint } from '../models/iendpoint';
import { LogManager } from '../../../managers/logManager';
import { IntellisenseGraphManager } from './intellisenseGraphManager';

var _queryCompletionManager:ElasticsearchQueryCompletionManager;

export class ElasticsearchQueryCompletionManager {
    
    public getEndpointWithId(endpointId:string): IEndpoint {
        return IntellisenseGraphManager.get().getEndpointWithId(endpointId);
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

                let getNode:((step:string, token:PropertyToken, tokens:PropertyToken[], edges:Edge[], visited:Edge[], graph:Graph)=> Node)[] = [];
                getNode.push(
                    (step, token, tokens, edges, visited, graph) => {

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
                    (step, token, tokens, edges, visited, graph) => {

                        for(let edge of edges) {
                            let targetNode = graph.getNodeWithId(edge.targetId);
                            let contextToken = tokens.find(t=> t.depth === token.depth && t.text === targetNode.label);

                            if(contextToken) {
  
                                let edgesBasedOnContext = graph.getEdgesWithSourceId(edge.targetId);

                                for(let e of edgesBasedOnContext) {
                                    let contextNode = graph.getNodeWithId(e.targetId);
                                    let contextNodeEdges = graph.getEdgesWithSourceId(contextNode.id);

                                    for(let contextNodeEdge of contextNodeEdges) {
                                        let node = graph.getNodeWithId(contextNodeEdge.targetId);

                                        if(node.label === contextToken.propertyValueToken.text) {

                                            let edges = graph.getEdgesWithSourceId(node.id);

                                            for(let edge of edges) {
                                                let node = graph.getNodeWithId(edge.targetId);

                                                if(node.label === step) {
                                                    visited.push(edge);
                                                    return node;
                                                }
                                            }
                                        }
                                    } 
                                }
                            }

                        }

                    return null;
                });

                getNode.push(
                    (step, token, tokens, edges, visited, graph) => {

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
                            node = fn.call(this, step, currentTokenAtThisDepth, tokens, edges, visited, graph);

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
        let manager = IntellisenseGraphManager.get();
        return manager.getGraphWithMethod(method);
    }

    protected getGraphWithEndpointId(endpointId:string): Graph {

        let manager = IntellisenseGraphManager.get();
        return manager.getGraphWithEndpointId(endpointId);
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

            text = text.replace('{{', '{').replace('}}', '}');
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

    public static get(): ElasticsearchQueryCompletionManager {

    
        if(!_queryCompletionManager) {
            _queryCompletionManager = new ElasticsearchQueryCompletionManager();
        }
    
        return _queryCompletionManager;
    
    }
}
