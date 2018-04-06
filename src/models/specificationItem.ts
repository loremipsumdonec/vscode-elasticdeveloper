'use strict'

export interface SpecificationItem {
    id:string,
    documentation:string,
    methods:string[],
    paths:string[],
    url:any,
    body:any
    depth:number
}