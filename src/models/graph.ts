'use strict'

export class Graph {

    private _nodes:Node[] = [];
    private _links:Link[] = [];

    public get nodes():Node[] {
        return this._nodes;
    }

    public get links():Link[] {
        return this._links;
    }

    public hasNode(nodeId:string): boolean {

        let index = this._nodes.findIndex(n=> n.id === nodeId);
        return index > -1;
    }

    public hasLink(linkId:string): boolean {

        let index = this._links.findIndex(l=> l.id === linkId);
        return index > -1;
    }

    public getNode(nodeId:string): Node {
        return this._nodes.find(n=> n.id === nodeId);
    }

    public getLeafs(nodeId:string): any {

        let items:any[] = [];
        let queue:string[] =  [];
        let links =  this._links.filter(l=> l.sourceId === nodeId);

        for(let link of links) {
            queue.push(link.targetId);
        }

        while(queue.length > 0) {

            let id = queue.pop();
            let links =  this._links.filter(l=> l.sourceId === id);
            let node = this._nodes.find(n=> n.id === id);
            
            if(node.item) {
                items.push(node.item);
            }
            
            for(let link of links) {
                queue.push(link.targetId);
            }
            
        }

        console.log(items);
        return items;
    }

    public addNode(nodeId:string, item:any) {

        let node = this._nodes.find(n=> n.id === nodeId);

        if(node && !node.item) {
            node.item = item;
        } else if(!node) {
            this._nodes.push({
                id: nodeId,
                item:item
            });
        }

    }

    public addLink(sourceNodeId:string, targetNodeId:string) {

        let linkId = sourceNodeId +'_'+ targetNodeId;
        
        if(!this.hasLink(linkId)) {

            let source:Node = this.getNode(sourceNodeId);
            let target:Node = this.getNode(targetNodeId);

            if(source && target) {
                let link:Link = {
                    id:linkId,  
                    sourceId:sourceNodeId,
                    targetId:targetNodeId
                }

                this._links.push(link);
            }

        }
        
    }

}

export interface Node {
    id:string;
    item:any;
}

export interface Link {
    id?:string;
    sourceId:string;
    targetId:string;
}