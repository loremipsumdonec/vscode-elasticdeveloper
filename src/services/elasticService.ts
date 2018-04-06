'use strict'

import * as vscode from 'vscode';
import * as request from 'request'

import { ElasticsearchQuery } from '../models/elasticSearchQuery';
import { ElasticsearchResponse } from '../models/elasticSearchResponse';
import { ElasticsearchQueryDocument } from '../parsers/elasticSearchQueryDocument';
import { Environment } from '../models/environment';

export class ElasticService {

    private _host: string;

    constructor(host:string) {
        this._host = host;
    }

    public static async execute(query:any, environment:any): Promise<ElasticsearchResponse> {
        
        let host:string;
        let q:ElasticsearchQuery;

        if(!(query instanceof Object)) {
            q = ElasticsearchQuery.parse(query as string);
        } else {
            q = query;
        }
        
        if(environment instanceof Object) {
            host = (environment as Environment).host;
            
        } else {
            host = environment as string;
        }

        let service = new ElasticService(host);
        let response = await service.execute(q);

        if(q.hasName) {
            response.name = q.name;
        }

        response.environment = environment;

        return response;
    }

    public async execute(query:ElasticsearchQuery) : Promise<ElasticsearchResponse> {
        return this.perform(query.command, query.body, query.method);
    }

    public async perform(url: string, body:string, method:string = 'GET') : Promise<ElasticsearchResponse> {

        let uri = this._host + url;
        let options: any = {
            method: method,
            url: uri,
            body: body,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        };

        return new Promise<ElasticsearchResponse>((resolve, reject)=> {

            request(options, (error, response, body)=> {
                if(error) {

                    let elasticsearchResponse = {
                        statusCode: 0,
                        message: error.message,
                        completed: false
                    }

                    reject(elasticsearchResponse);

                } else {

                    let elasticsearchResponse = response.toJSON();
                    elasticsearchResponse.message = response.statusMessage;
                    
                    if(elasticsearchResponse.body) {
                        elasticsearchResponse.body = JSON.parse(elasticsearchResponse.body);
                    }

                    if(response.statusCode === 200) {
                        elasticsearchResponse.completed = true;
                    } else {
                        elasticsearchResponse.completed = false;
                    }

                    resolve(elasticsearchResponse);
                    
                }
            });

        }); 
    }

    public post(url: string, body) {
    }

}