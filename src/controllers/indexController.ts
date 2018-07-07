'use strict'

import * as vscode from 'vscode';
import * as constant from '../constant';

import { Controller } from './controller';
import { ElasticsearchQuery } from '../models/elasticsearchQuery';
import { Environment } from '../models/environment';

export class IndexController extends Controller {

    public async delete(name:string, environment?: Environment) {

        if(name) {
            let query = ElasticsearchQuery.parse('DELETE /' + name);
            let response = await this.executeQuery(query, environment);

            if(response.completed) {
                this.info(false, 'deleted index %s', name);
            } else {
                this.view(response);
            }
        }
    }

}