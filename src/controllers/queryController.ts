'use strict'

import * as vscode from 'vscode';

import { Controller } from './controller';
import { ElasticsearchQuery } from '../models/elasticsearchQuery';
import { Configuration } from '../models/configuration';

export class QueryController extends Controller {

    public async runQuery(query: ElasticsearchQuery, configuration?:Configuration) {

        let response = await this.executeQuery(query);
        this.view(response, configuration);

    }

    public async runAllQueries(queries: ElasticsearchQuery[], configuration?:Configuration) {

        let model = {
            responses: []
        };

        for(let query of queries) {

            let response = await this.executeQuery(query);

            if(query.hasName) {
                model[query.name] = response;
            } else {
                model.responses.push(response);
            }

        }

        this.view(model, configuration);
    }

}
