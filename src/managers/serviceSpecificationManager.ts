'use strict'

import * as urlhelper from '../helpers/url';
import { SpecificationItem } from '../models/specificationItem';
import { Graph } from '../models/graph';
import { doesNotThrow } from 'assert';
import { stat } from 'fs';

var _serviceSpecificationManager:ServiceSpecificationManager;

export class ServiceSpecificationManager {

    private _index = {};
    private _paths = [];
    private _specificationItems:SpecificationItem[] = []

    public getSuggestionsWithMethod(method:string, command:string):any[] {

        let methodUppercase = method.toUpperCase();
        let steps:string[] = [];
        let currentDepth = 0;
        let suggestions = [];

        if(command && command.length > 0) {
            steps = urlhelper.getSteps(command);
            this.loadPathSuggestions(methodUppercase, steps, suggestions);
        }

        return suggestions;
    }

    private loadPathSuggestions(method:string, steps:string[], items:any[]) {

        const currentDepth = steps.length -1;
        const command = '/' + steps.slice(0, steps.length).join('/');

        for(let path of this._index[method]) {

            if(path.steps.length >= steps.length) {

                let st = path.steps.slice(0);
                let status = false;

                for(let position = steps.length - 1; position >= 0; position--) {
                    status = st[position].startsWith(steps[position]);

                    if(!status) {

                        let match = st[position].match(/\{index|name\}/);

                        if(match) {
                            status = true;
                        } else {
                            break;
                        }
                    }
                }

                if(status) {
                    
                    let p =  '/' + st.slice(currentDepth, st.length).join('/');

                    items.push(
                        {
                            value: p,
                            isEndpoint: path.isEndpoint,
                            detail: path.id
                        }
                    );
                }

            }

        }
    }

    public clearSpecificationItems() {
        this._index = {};
        this._specificationItems = [];
    }

    public addSpecificationItem(specificationItem:SpecificationItem) {

        if(specificationItem) {

            for(let path of specificationItem.url.paths) {

                let steps = urlhelper.getSteps(path);

                for(let i = 0; i < specificationItem.methods.length; i++) {

                    const method = specificationItem.methods[i];

                    if(!this._index[method]) {
                        this._index[method] = [];
                    }

                    for(let depth = 0; depth < steps.length; depth++) {

                        let isEndpoint:boolean = depth === steps.length - 1;
                        let p =  '/' + steps.slice(0, depth + 1).join('/');    
                        let exists = this._index[method].find(v=> v.value === p);

                        if(!exists) {
                            
                            this._index[method].push({
                                value: p,
                                steps: steps.slice(0, depth + 1),
                                isEndpoint: isEndpoint,
                                id: specificationItem.id
                            });

                        } else if (!exists.isEndpoint && isEndpoint) {
                            exists.isEndpoint = true;
                        }

                    }
                }
            }

        }
    }

    public static get(): ServiceSpecificationManager {

        if(!_serviceSpecificationManager) {
            _serviceSpecificationManager = new ServiceSpecificationManager();
        }
    
        return _serviceSpecificationManager;
    }

    public static decorateWith(decorate:any) {
    
        let serviceSpecificationManager = this.get();
        _serviceSpecificationManager = decorate(serviceSpecificationManager);
    }

}
