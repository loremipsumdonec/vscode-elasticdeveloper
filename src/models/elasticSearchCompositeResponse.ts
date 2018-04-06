'use strict'

import { Environment } from "./environment";
import { ElasticsearchResponse } from "./elasticsearchResponse";

export class ElasticSearchCompositeResponse implements ElasticsearchResponse {

    private _completed:boolean;
    private _message:string;
    private _statusCode:number;

    private _responses:ElasticsearchResponse[];

    public add(response:ElasticsearchResponse) {
        this._responses.push(response);
    }

    message:string;

    completed:boolean;

    statusCode?:number;

    headers?:object;

    request?:object;

    body?:string

    environment?:Environment

}