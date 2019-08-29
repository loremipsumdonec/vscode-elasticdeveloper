'use strict'

import * as request from 'request'

import { ElasticsearchQuery } from '../models/elasticsearchQuery';
import { ElasticsearchResponse } from '../models/elasticsearchResponse';
import { Environment } from '../models/environment';
import { LogManager } from '../managers/logManager';

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

        let url = query.getUrl();

        if(query.isBulk) {
            return this.performBulk(url, query.bulk, query.method);
        } else {
            return this.perform(url, query.body, query.method);
        }
    }

    public async perform(url: string, body:string, method:string = 'GET', contentType:string = 'application/json') : Promise<ElasticsearchResponse> {
        if (contentType !== 'application/x-ndjson') {
            body = this.normalizeBody(body);
        }

        let uri = this._host + url;
        let options: any = {
            method: method,
            url: uri,
            body: body,
            headers: {
                'Accept': 'application/json',
                'Content-Type': contentType
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

                        try
                        {
                            elasticsearchResponse.body = JSON.parse(elasticsearchResponse.body);

                            if(response.statusCode === 200) {
                                elasticsearchResponse.completed = true;
                            } else {
                                elasticsearchResponse.completed = false;
                            }

                        } catch(ex) {

                            LogManager.warning(false, 'failed parse elasticsearchResponse.body with reason %s', ex.message);
                            elasticsearchResponse.message = 'elastic developer failed parse elasticsearchResponse.body with reason ' + ex.message;
                            elasticsearchResponse.completed = false;
                        }
                    } else {

                        if(response.statusCode === 200) {
                            elasticsearchResponse.completed = true;
                        } else {
                            elasticsearchResponse.completed = false;
                        }
                    }

                    resolve(elasticsearchResponse);

                }
            });

        });
    }

    public async performBulk(url: string, bulk:string[], method:string = 'POST'): Promise<ElasticsearchResponse> {

        let body = '';

        LogManager.verbose('building NDJSON of a array with %s entries', bulk.length);

        for(let index = 0; index < bulk.length; index++) {
            body += bulk[index].replace(/[\r\n]+/g, '');
            body += '\r\n';
        }

        return this.perform(url, body, method, 'application/x-ndjson');
    }

    public post(url: string, body) {
    }

    private normalizeBody(body:string):string {

        if(body && body.length > 0) {
            body = body.replace(/[\r\n]+/g, '');
        }

        return body;
    }

}
