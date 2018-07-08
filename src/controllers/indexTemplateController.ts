'use strict'

import * as vscode from 'vscode';
import * as constant from '../constant';

import { Controller } from './controller';
import { IndexTemplate } from '../models/indexTemplate';
import { ElasticsearchQuery } from '../models/elasticsearchQuery';
import { Environment } from '../models/environment';

export class IndexTemplateController extends Controller {

    public async deploy(indexTemplate:IndexTemplate) {

        if(indexTemplate.name) {
            let query = ElasticsearchQuery.parse('PUT /_template/' + indexTemplate.name, indexTemplate);
            let response = await this.executeQuery(query);

            if(response.completed) {
                this.info(false, 'deployed index template %s', indexTemplate.name);
            } else {
                this.view(response);
            }
        }
    }

    public async retract(indexTemplate:IndexTemplate, environment?: Environment) {

        if(indexTemplate && indexTemplate.hasName) {

            let query = ElasticsearchQuery.parse('DELETE /_template/' + indexTemplate.name);
            let response = await this.executeQuery(query, environment);

            if(response.completed) {
                this.info(false, 'retracted index template %s', indexTemplate.name);
            } else {
                this.view(response);
            }
        }

    }

    protected getIndexTemplateName(fileName:string): string {
        return this.getFileName(fileName, constant.IndexTemplateLanguageId);
    }

}