'use strict'

import * as vscode from 'vscode';
import * as constant from '../../../constant';
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

var _queryCompletionManager:ElasticsearchQueryCompletionManager;

export class ElasticsearchQueryCompletionManager {
    
    private _bodyGraph:Graph;
    private _versionNumber:string

    constructor(versionNumber?:string) {
        this._versionNumber = versionNumber;
    }

    public getCompletionItems(query:ElasticsearchQuery, offset:number, triggerCharacter:string): vscode.CompletionItem[] {

        let completionItems:vscode.CompletionItem[] = [];

        let token = query.tokenAt(offset);

        switch(token.type) {
            case TokenType.Command:
                this.getCompletionItemsForQueryCommand(query);
                break;
            case TokenType.Body:
            completionItems = this.getCompletionItemsForQueryBody(query, offset, triggerCharacter);
                break;
        }

        /*let queryBodySnippet = new vscode.CompletionItem('body', vscode.CompletionItemKind.Snippet);
        queryBodySnippet.insertText = new vscode.SnippetString('\n\t"query": {$0\n\t}\n');

        completionItems.push(queryBodySnippet);
        */

        return completionItems;
    }

    public getCompletionItemsForQueryCommand(query:ElasticsearchQuery) {
        console.log('getCompletionItemsForQueryCommand');
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
                let node:Node = null;
    
                for(let index = 0; index < steps.length; index++) {
    
                    let nodeId = steps[index]
                    let nextNodeId = steps[index + 1];
    
                    if(!node) {
                        node = this._bodyGraph.getNodeWithId(nodeId);
                    } 
                    
                    if(node) {
    
                        let children = this._bodyGraph.getOutgoingNodes(node.id);
    
                        if(index == steps.length - 1) {
                            completionItems = this.createCompletionItems(children, triggerCharacter);
                        } else {
                            node = children.find(n=> n.label === nextNodeId);
    
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

            } else {
                let children = this._bodyGraph.getRootNodes();
                children = children.filter(n=> !n.data.isTemplate);
                completionItems = this.createCompletionItems(children, triggerCharacter);
            }

        }

        return completionItems;
    }

    private createCompletionItems(nodes:Node[], triggerCharacter:string): vscode.CompletionItem[] {

        let completionItems:vscode.CompletionItem[] = [];

        for(let node of nodes) {
            let item = new vscode.CompletionItem(node.label, node.data.kind);
            let label:string =  this.getCompletionItemLabel(node, triggerCharacter);

            switch(item.kind) {
                case vscode.CompletionItemKind.Class:
                    item.insertText = new vscode.SnippetString(label + ': {$0\n}');
                    break;
                case vscode.CompletionItemKind.Enum:
                    item.insertText = new vscode.SnippetString(label +': ["${0}"]');
                    break;
                case vscode.CompletionItemKind.Reference:
                    item.insertText = new vscode.SnippetString(label +': [{${0}\n}]');
                    break;
                case vscode.CompletionItemKind.Field:
                    if(node.data.defaultValue) {
                        let defaultValue = node.data.defaultValue.toString().replace('{','').replace('}', '');
                        item.insertText = new vscode.SnippetString(label +': "${2:' + defaultValue + '}"$0');
                    } else {
                        item.insertText = new vscode.SnippetString(label +': "${2}"$0');
                    }
                    break;
                case vscode.CompletionItemKind.Value:
                    item.insertText = new vscode.SnippetString(label);
                    break;
                case vscode.CompletionItemKind.Struct:
                    item.insertText = new vscode.SnippetString('[{$0\n\t}]');
                    break;
            }

            completionItems.push(item);
        }

        return completionItems;
    }

    private getCompletionItemLabel(node:Node, triggerCharacter:string):string {

        let label:string;

        if(triggerCharacter === '"') {
            label = node.label;
        } else {
            label = '"'+ node.label +'"';
        }

        let matches = label.match(/\{(\w+)\}/g);

        if(matches) {

            let index = 1;

            for(let m of matches) {
                let key = m.substring(1, m.length - 1);
                label = label.replace(m, '${' + index + ':' + key + '}');
                index++;
            }
        }

        return label;
    }

    private initBodyGraph() {

        this._bodyGraph = new Graph();
        this._bodyGraph.addNode('query', 'query');
        this._bodyGraph.addNode('query.match', 'match');
        this._bodyGraph.addNode('query.match_phrase', 'match_phrase');
        this._bodyGraph.addNode('query.match_phrase_prefix', 'match_phrase_prefix');
        this._bodyGraph.addNode('query.multi_match', 'multi_match');
        this._bodyGraph.addNode('query.bool', 'bool');

        this._bodyGraph.addNode('query.match.field', '{field}');
        this._bodyGraph.addNode('query.match_phrase.field', '{field}');
        this._bodyGraph.addNode('query.match_phrase.field.query', 'query');
        this._bodyGraph.addNode('query.match_phrase.field.analyzer', 'analyzer');
        this._bodyGraph.addNode('query.match_phrase.field.slop', 'slop');

        this._bodyGraph.addNode('query.bool.must', 'must');
        this._bodyGraph.addNode('query.bool.should', 'should');
        this._bodyGraph.addNode('query.bool.filter', 'filter');
        this._bodyGraph.addNode('query.bool.must_not', 'must_not');

        this._bodyGraph.addEdge('query','query.match');
        this._bodyGraph.addEdge('query','query.match_phrase');
        this._bodyGraph.addEdge('query','query.match_phrase_prefix');
        this._bodyGraph.addEdge('query','query.multi_match');
        this._bodyGraph.addEdge('query','query.bool');

        this._bodyGraph.addEdge('query.match', 'query.match.field');
        this._bodyGraph.addEdge('query.match_phrase','query.match_phrase.field');
        this._bodyGraph.addEdge('query.match_phrase.field', 'query.match_phrase.field.query');
        this._bodyGraph.addEdge('query.match_phrase.field', 'query.match_phrase.field.analyzer');
        this._bodyGraph.addEdge('query.match_phrase.field', 'query.match_phrase.field.slop');

        this._bodyGraph.addEdge('query.bool','query.match');
        this._bodyGraph.addEdge('query.bool','query.match_phrase');
        this._bodyGraph.addEdge('query.bool','query.match_phrase_prefix');
        this._bodyGraph.addEdge('query.bool','query.multi_match');

    }

    private initBodyGraphFromFiles() {

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

                                this._bodyGraph.addNode(arrayObjectNodeId, '[0]', { kind: vscode.CompletionItemKind.Struct });
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

                        this._bodyGraph.addNode(nodeId, key, { kind: kind, isTemplate:isTemplate });

                        this._bodyGraph.addEdge(path, nodeId);
                        this.buildBodyGraph(current, nodeId);

                    } else {

                        this._bodyGraph.addNode(nodeId, key, { kind: vscode.CompletionItemKind.Field, defaultValue: current });
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

    public static get(): ElasticsearchQueryCompletionManager {

    
        if(!_queryCompletionManager) {
            _queryCompletionManager = new ElasticsearchQueryCompletionManager();
        }
    
        return _queryCompletionManager;
    
    }
}
