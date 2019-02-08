'use strict'

import * as vscode from 'vscode';
import * as elasticsearchQueryFactory from '../models/elasticsearchQuery';

import { Controller } from './controller';
import { Environment } from '../models/environment';
import { Version } from '../models/version';

export class EnvironmentController extends Controller {

    public async setAsTarget(environment: Environment) {

        let query = elasticsearchQueryFactory.createPingQuery();
        let response = await this.executeQuery(query, environment);

        if(response.completed) {
            environment.version = Version.parse(response.body.version.number);
        }

        this.environment = environment;
    }

    public async ping(environment: Environment) {

        let query = elasticsearchQueryFactory.createPingQuery();
        let response = await this.executeQuery(query, environment);

        if(response.completed) {
            vscode.window.showInformationMessage(response.message + ' from ' + response.environment);
        } else {
            vscode.window.showWarningMessage(response.message);
        }

    }

}
