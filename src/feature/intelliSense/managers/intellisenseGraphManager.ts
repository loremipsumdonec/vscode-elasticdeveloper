'use strict'

import * as vscode from 'vscode';
import * as constant from '../../../constant';
import * as fs from 'fs';
import * as path from 'path'

import { Graph, Node, Edge } from "../../../models/graph";
import { Version } from '../../../models/version';
import { LogManager } from '../../../managers/logManager';
import { EnvironmentManager } from '../../../managers/environmentManager';
import { isArray, isObject } from 'util';
import { IEndpoint } from '../models/IEndpoint';

var _intellisenseGraphManager:IntellisenseGraphManager;

export class IntellisenseGraphManager {
    private _endpoints:any;
    private _graphs:any;
    private _versionNumber:string

    public static get(): IntellisenseGraphManager {

        if(!_intellisenseGraphManager) {
            _intellisenseGraphManager = new IntellisenseGraphManager();
        }

        return _intellisenseGraphManager;
    }

    constructor() {
        this._graphs = {};
        this._endpoints = {};

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

    public getGraphWithMethod(method:string): Graph {
        let key = 'method_' + method.toLowerCase();

        if(!this._graphs[key]) {
            this.loadEndpointGraphs();
        }

        return this._graphs[key];
    }

    public getEndpointWithId(endpointId:string): IEndpoint {
        return this._endpoints[endpointId];
    }

    public getGraphWithEndpointId(endpointId:string): Graph {

        if(!this._graphs[endpointId]) {
            this.loadGraphWithEndpointId(endpointId);
        }

        return this._graphs[endpointId];
    }

    private loadGraphWithEndpointId(endpointId:string) {

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
                                this.loadEndpointDslGraph(source[key], graph, 100);
                            }
                            delete source[key];
                        }
                    }

                    this.loadEndpointDslGraph(source, graph);
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
                let incomingEdges = graph.findEdges(e=> e.targetId == edge.sourceId && e.kind !== 'children_of');

                if(incomingEdges.length > 0) {
                    let stack:Edge[] = graph.findEdges(e=> e.sourceId == edge.sourceId && e.kind === 'children_of');
                    let children:string[] = [];
                    let visited:string[] = [];

                    while(stack.length > 0) {
                        let current = stack.pop();

                        if(!visited.find(v => v === current.targetId)) {
                            visited.push(current.targetId);

                            if(current.kind === 'children_of') {
                                let childrenOfEdges = graph.getEdgesWithSourceId(current.targetId);
                                childrenOfEdges.forEach(e => stack.push(e));
                            } else {
                                children.push(current.targetId);
                            }

                        }

                    }

                    for(let childNodeId of children) {
                        let child = graph.getNodeWithId(childNodeId);

                        child.data.types.forEach(t=>
                            graph.addEdge(edge.sourceId, child.id, null, t)
                        );
                    }
                }
            }

            this._graphs[endpointId] = graph;

            LogManager.verbose('loaded graph %s with %s nodes and %s edges', endpointId, graph.getNodes().length, graph.getEdges().length);
        }
    }

    private loadEndpointDslGraph(source, graph:Graph, startDepth:number = 0) {

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

            if(isArray(source)) {
                this.addArrayNodeToEndpointDslGraph(source, path, null, null, context, stack, graph);
            } else if(isObject(source)) {

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

                            this.addArrayNodeToEndpointDslGraph(current, path, nodeId, key, context, stack, graph);

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

                            if(current.__array || current.__object || current.__string) {

                                if(current.__array) {

                                    graph.addNode(nodeId + '-array', key, {
                                        id: key,
                                        types: ['array'],
                                        depth: context.depth
                                    });

                                    graph.addEdge(path, nodeId + '-array', null, 'array');
                                    stack.push({ source: current.__array, path: nodeId + '-array', types: ['array'], depth: context.depth + 1});
                                }

                                if(current.__object) {

                                    graph.addNode(nodeId + '-object', key, {
                                        id: key,
                                        types: ['object'],
                                        depth: context.depth
                                    });

                                    graph.addEdge(path, nodeId + '-object', null, 'object');
                                    stack.push({ source:current.__object, path: nodeId + '-object', types: ['object'], depth: context.depth + 1});
                                }

                                if(current.__string) {

                                    graph.addNode(nodeId + '-string', key, {
                                        id: key,
                                        types: ['string'],
                                        depth: context.depth
                                    });

                                    graph.addEdge(path, nodeId + '-string', null, 'string');
                                    stack.push({ source:current.__string, path: nodeId + '-string', types: ['string'], depth: context.depth + 1});
                                }

                            } else {
                                stack.push({ source:current, path: nodeId, types: types, depth: context.depth + 1});

                                graph.addNode(nodeId, key, {
                                    id: key,
                                    types: types,
                                    depth: context.depth
                                });

                                types.forEach(t=>
                                    graph.addEdge(path, nodeId, null, t)
                                );
                            }

                        } else {

                            let type = typeof(current);
                            let defaultValue = current;

                            types.push(type);

                            graph.addNode(nodeId, key, {
                                id: key,
                                defaultValue: defaultValue,
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

    private addArrayNodeToEndpointDslGraph(array:any[], path:string, nodeId:string, nodeLabel:string, context:any, stack:any[] , graph:Graph) {

        if(array.length > 0) {

            if(!nodeId) {
                nodeId = path;
            } else {
                graph.addNode(nodeId, nodeLabel, { types: ['array'], depth: context.depth});
                graph.addEdge(path, nodeId, null, 'array');
            }

            for(let index = 0; index < array.length;index++) {
                let arrayEntry =  array[index];
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

                    graph.addNode(arrayEntryNodeId, id, {
                        id: id,
                        types: [type],
                        defaultValue: arrayEntry.toString(),
                        depth: depth
                    });

                    graph.addEdge(nodeId, arrayEntryNodeId, null, type);
                }
            }
        }
    }

    private loadEndpointGraphs() {

        let files = this.getEndpointSpecificationFiles();

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

        let graphNames = Object.keys(this._graphs);

        for(let file of files) {
            const fileContent = fs.readFileSync(file, 'UTF-8');
            let source = JSON.parse(fileContent);

            if(!source.params) {
                source.params = {};
            }

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
                let edges = graph.getEdges();

                for(let node of nodes) {
                    node.data.isDynamicNode = node.label.endsWith('}');
                }

                LogManager.verbose('loaded graph %s with %s nodes and %s edges',key, nodes.length, edges.length);
            }
        }
    }

    private getEndpointSpecificationFiles():string[] {

        let files:string[] = [];
        let extension = vscode.extensions.getExtension(constant.ExtensionId);
        let versionNumber = this.getVersionNumber();

        if(versionNumber) {

            let folderPath =  path.join(extension.extensionPath, 'resources', versionNumber, 'rest-api-spec');
            files = this.getFilesWithFolderPath(folderPath)
                                            .filter(f=> !f.endsWith('_common.json'))

            LogManager.verbose('found %s files for rest-api-spec version %s', files.length, versionNumber);
        }

        return files;
    }

    private getEndpointFile(endpointId:string):string {

        if(endpointId.startsWith('endpoint_')) {
            endpointId = endpointId.replace('endpoint_', '');
        }

        let extension = vscode.extensions.getExtension(constant.ExtensionId);
        let versionNumbers:string[] = [];
        let file:string = null;

        versionNumbers.push(this.getDefaultVersionNumber());
        versionNumbers.push(this.getVersionNumber());

        while(versionNumbers.length > 0) {

            let versionNumber = versionNumbers.pop();
            file =  path.join(extension.extensionPath, 'resources', versionNumber, 'endpoints', endpointId + '.json');

            if(fs.existsSync(file)) {
                break;
            } else {
                file = null;
            }

        }

        return file;
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

    private getDefaultVersionNumber():string {

        let versionNumber:string = null;

        let extension = vscode.extensions.getExtension(constant.ExtensionId);
        let folderPath = path.join(extension.extensionPath, 'resources');
        let version = Version.parse(constant.DefaultVersion);

        let folders = fs.readdirSync(folderPath)
            .filter(
                f=> fs.statSync(path.join(folderPath, f)).isDirectory()
            );

        let closestVersion = Version.getClosest(version, folders);

        if(closestVersion) {
            versionNumber = closestVersion.toString();
        }

        return versionNumber;
    }

    private getVersionNumber():string {

        let versionNumber:string = null;

        if(this._versionNumber) {
            versionNumber = this._versionNumber;
        } else {
            let environment = EnvironmentManager.get().environment;

            let extension = vscode.extensions.getExtension(constant.ExtensionId);
            let folderPath = path.join(extension.extensionPath, 'resources');

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
}
