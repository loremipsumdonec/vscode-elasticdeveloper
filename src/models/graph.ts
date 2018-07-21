'use strict'

export class Graph {

    private _nodes:Node[] = [];
    private _edges:Edge[] = [];
    private _pendingEdges:Edge[] = [];

    public clear() {
        this._nodes = [];
        this._edges = [];
        this._pendingEdges = [];
    }

    public addNode(nodeId:string, label?:string, data?:any) {

        if(this.hasNotNodeWithId(nodeId)) {

            let node = {
                id: nodeId,
                label:label,
                data:data,
                incoming:0
            }

            this._nodes.push(node);

            let pendingEdges = this._pendingEdges.filter(e=> e.sourceId == nodeId || e.targetId == nodeId);

            for(let edge of pendingEdges) {
                if(this.hasNodeWithId(edge.sourceId) && this.hasNodeWithId(edge.targetId)) {
                    
                    this._edges.push(edge);
                    this._pendingEdges = this._pendingEdges.filter(e=> e.id !== edge.id);
                    
                    if(nodeId !== edge.targetId) {
                        let target = this.getNodeWithId(edge.targetId);
                        target.incoming++;
                    } else {
                        node.incoming++;
                    }
                }
            }
            
        }

    }

    public getNodes():Node[] {
        return this._nodes;
    }

    public getRootNodes():Node[] {
        return this._nodes.filter(n=> n.incoming === 0);
    }

    public getOutgoingNodes(nodeId:string):Node[] {
        let nodes:Node[] = [];

        let edges = this.getEdgesWithSourceId(nodeId);

        for(let edge of edges) {
            
            let node = this.getNodeWithId(edge.targetId);
            
            if(node) {
                nodes.push(node);
            }
        }

        return nodes;
    }

    public hasNotNodeWithId(nodeId:string): boolean {
        return !this.hasNodeWithId(nodeId);
    }

    public hasNodeWithId(nodeId:string):boolean {
        return this.getNodeWithId(nodeId) != null;
    }

    public getNodeWithId(nodeId:string): Node {
        return this._nodes.find(n=> n.id === nodeId);
    }

    public addEdge(sourceId:string, targetId:string, edgeId?:string, kind?:string, weight?:number, directed?:boolean, data?:any) {
     
        if(sourceId && targetId) {

            if(edgeId == null) {

                if(kind) {
                    edgeId = sourceId + '_' + targetId + '_' + kind;
                } else {
                    edgeId = sourceId + '_' + targetId;
                }
            }
    
            if(this.hasNotEdgeWithId(edgeId)) {
    
                let edge = {
                    id:edgeId,
                    sourceId:sourceId,
                    targetId:targetId,
                    directed:true,
                    kind:kind,
                    weight:weight,
                    data:data
                };
    
                if(this.hasNodeWithId(sourceId) && this.hasNodeWithId(targetId)) {
                    let target = this.getNodeWithId(targetId);
                    target.incoming++;
                    this._edges.push(edge);
                } else {
                    this._pendingEdges.push(edge);
                }
            }

        }

    }

    public hasNotEdgeWithId(edgeId:string): boolean {
        return !this.getEdgeWithId(edgeId);
    }

    public hasEdgeWithId(edgeId:string):boolean {
        return this.getEdgeWithId(edgeId) != null;
    }

    public getEdgeWithId(edgeId:string): Edge {
        return this._edges.find(e=> e.id === edgeId);
    }

    public getEdgesWithSourceId(sourceId:string): Edge[] {
        return this._edges.filter(e=> e.sourceId === sourceId);
    }

    public getEdgesWithTargetId(targetId:string): Edge[] {
        return this._edges.filter(e=> e.targetId === targetId);
    }
}

export interface Node {
    id:string;
    label:string;
    data?:any;
    incoming:number;
}

export interface Edge {
    id?:string;
    directed:boolean;
    sourceId:string;
    targetId:string;
    kind:string;
    weight:number;
    data?:any;
}