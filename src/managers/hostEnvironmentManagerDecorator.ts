'use strict'

import { Environment } from "../models/environment";
import { EnvironmentManagerDecorator } from "./environmentManagerDecorator";
import { ElasticService } from '../services/elasticService';
import { ElasticsearchResponse } from '../models/elasticsearchResponse';
import { ElasticsearchQuery } from '../models/elasticsearchQuery';
import { Index } from '../models';
import { LogManager } from './logManager';

export class HostEnvironmentManagerDecorator extends EnvironmentManagerDecorator {

    public set environment(value:Environment) {

        super.environment = value;
        this.load();
    }
    
    public get environment(): Environment {
        return super.environment;
    }

    private async load() {
        this.loadIndices();
        this.loadAliases();
    }

    private async loadIndices() {

        let environment = super.environment;
        let response: ElasticsearchResponse = null;

        try {

            let response = await ElasticService.execute('GET /_cat/indices?v', environment);
            
            let body = response.body;
            let indices:Index[] = []

            for(let i of body) {
                let index:Index = {
                    id: i.uuid,
                    name: i.index
                };

                indices.push(index);
            }

            LogManager.verbose('loaded %s indices from %s', indices.length, environment);
            this.addIndices(indices);

        }catch(ex) {
            LogManager.warning(false, 'failed loading indices from %s. %s', environment, ex.message);
        }

    }

    private async loadAliases() {

        let environment = super.environment;
        let response: ElasticsearchResponse = null;

        try {

            let response = await ElasticService.execute('GET /_cat/aliases?v', environment);           
            let body = response.body;

            LogManager.verbose('loaded %s aliases from %s', '0', environment);
 
        }catch(ex) {
            LogManager.warning(false, 'failed loading aliases from %s. %s', environment, ex.message);
        }
    }

}

export function decorate() {

    return (manager) => {
        let decoratedManager = new HostEnvironmentManagerDecorator(manager);
        
        return decoratedManager;
    }

}