'use strict'

import * as request from 'request'
import { Graph, Node, Edge } from "../../../models/graph";
import { isObject } from 'util';

export class GephiStreamService {

    public async syncGraph(graph:Graph) {

        let batch = [];
        let visited:string[] = [];
        let pendingEdges:Edge[] = [];
        let nodes = graph.getRootNodes();
        
        if(nodes.length === 0) {
            graph.getNodes().forEach(n=> nodes.push(n));
        }

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
                        source:edge.sourceId,
                        target: edge.targetId,
                        directed:edge.directed,
                        kind: edge.kind ? edge.kind: ''
                    }
                }
            }
        );

    }

    public async sendEvent(event:any) {

        let output = JSON.stringify(event);

        let options = {
            method: 'POST',
            url: 'http://localhost:8080/workspace1?operation=updateGraph',
            body:output,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        }

        return new Promise((resolve, reject) => {

            request(options, (error, response, body)=> {
                if(error) {
                    reject();
                } else {
                    console.log(output);
                    resolve();
                }
            });

        });

    }

}