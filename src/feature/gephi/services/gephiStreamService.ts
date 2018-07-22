'use strict'

import * as request from 'request'
import { Graph } from "../../../models/graph";

export class GephiStreamService {

    public async syncGraph(graph:Graph) {

        let nodes = graph.getNodes();
        let edges = graph.getEdges();

        for(let node of nodes) {
            node.data.isDynamicNode = node.label.endsWith('}');
            
            this.updateGraph(
                {
                    an: {
                        [node.id]: {
                            label: node.label,
                            ...node.data
                        }
                    }
                }
            );
        }

        for(let edge of edges) {

            this.updateGraph(
                {
                    ae: {
                        [edge.id]: {
                            source:edge.sourceId,
                            target: edge.targetId,
                            directed:edge.directed
                        }
                    }
                }
            );
        }
    }

    public async updateGraph(event:any) {

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

        request(options, (error, response, body)=> {
            if(error) {
                console.log(error);
            }
        });

    }

}