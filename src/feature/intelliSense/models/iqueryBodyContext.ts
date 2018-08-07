'use strict'

import { PropertyToken } from '../../../models/propertyToken';
import { Graph, Node } from "../../../models/graph";

export interface IQueryBodyContext {
    depth?:number;
    node:Node,
    nodes:Node[],
    step:string,
    path:string,
    token:PropertyToken,
    tokens:PropertyToken[],
    graph:Graph
}