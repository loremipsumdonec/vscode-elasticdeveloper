
export interface IEndpoint {
    id:string,
    documentation?:string,
    methods:string[],
    url:IEndpointUrl,
    body:IEndpointBody
}

export interface IEndpointUrl {
    path:string,
    paths:string[],
    parts?:any;
    params?:any;
}

export interface IEndpointBody {
    description:string,
    required?:boolean
}