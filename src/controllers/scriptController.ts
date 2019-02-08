'use strict'

import * as vscode from 'vscode';
import * as constant from '../constant';

import { Controller } from './controller';
import { ElasticsearchQuery } from '../models/elasticsearchQuery';
import { Environment } from '../models/environment';

export class ScriptController extends Controller {

    public async deploy(script:any) {
    }

    public async retract(scriptId:string, environment?: Environment) {

        let query = ElasticsearchQuery.parse('DELETE /_scripts/' + scriptId);
        let response = await this.executeQuery(query, environment);

        if(response.completed) {
            this.info(false, 'retracted script %s', scriptId);
        } else {
            this.view(response);
        }
    }
}
