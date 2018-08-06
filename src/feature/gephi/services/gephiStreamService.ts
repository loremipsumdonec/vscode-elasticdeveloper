'use strict'

import * as request from 'request'
import { Graph, Node, Edge } from "../../../models/graph";
import { isObject } from 'util';
import { LogManager } from '../../../managers/logManager';

export class GephiStreamService {

    private _url:string;
    private _buffer:string[];

    constructor(url:string) {
        this._url = url;
        this._buffer = [];
    }

    public async syncGraph(graph:Graph) {

        let visited:string[] = [];
        let pendingEdges:Edge[] = [];
        let nodes = [];
        graph.getNodes().forEach(n=> nodes.push(n));

        while(nodes.length > 0) {
            let node = nodes.pop();

            if(!visited.find(nodeId => nodeId === node.id)) {
                visited.push(node.id);
                await this.syncNode(node);

                pendingEdges.filter(e=> e.targetId === node.id)
                    .forEach(e=> this.syncEdge(e));

                pendingEdges = pendingEdges.filter(e=> e.targetId !== node.id)

                graph.getEdgesWithSourceId(node.id).forEach(edge=> {
                    
                    let child = graph.getNodeWithId(edge.targetId);
                    pendingEdges.push(edge);
                    nodes.push(child);
                });
            }
        }

        pendingEdges.forEach(e=> this.syncEdge(e));
        this.flush();
    }

    public async syncNode(node:Node) {

        let body = {
            label: node.label
        }

        if(node.data) {

            body = {
                label: node.label,
                ...node.data
            }

            Object.keys(body).forEach(key => {

                if(isObject(body[key])) {
                    delete body[key];
                }

            });;
            
        }

        await this.sendEvent(
            {
                an: {
                    [node.id]: body
                }
            }
        );

    }

    public async syncEdge(edge:Edge) {


        this.sendEvent(
            {
                ae: {
                    [edge.id]: {
                        label: edge.kind ? edge.kind: '',
                        source:edge.sourceId,
                        target: edge.targetId,
                        directed:edge.directed,
                        kind: edge.kind ? edge.kind: ''
                    }
                }
            }
        );

    }

    public async sendEvent(event:any, force:boolean = false) {

        if(this._buffer.length > 20 || force) {

            if(event) {
                let output = JSON.stringify(event);
                this._buffer.push(output);
            }
            

            let url = this._url + '?operation=updateGraph';
            let body = ''

            while(this._buffer.length > 0){
                if(body.length === 0) {
                    body = this._buffer.pop();
                } else {
                    body += '\r\n' + this._buffer.pop();
                }
            }

            body += '\r\n';

            let options = {
                method: 'POST',
                url: this._url + '?operation=updateGraph',
                body:body,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
    
            return new Promise((resolve, reject) => {
    
                request(options, (error, response, body)=> {
                    if(error) {
                        LogManager.warning(false, 'failed streaming events to %s with error code %s', url, error.code);
                        LogManager.warning(false, error.message);
                        reject();
                    } else {
                        resolve();
                    }
                });
    
            });

        } else {

            if(event) {
                let output = JSON.stringify(event);
                this._buffer.push(output);
            }
        }

    }

    private flush() {
        this.sendEvent(null, true);
    }
}