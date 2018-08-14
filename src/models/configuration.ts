'use strict'

import * as constant from '../constant';
import { Entity } from './entity';
import { PropertyToken } from './propertyToken';
import { TokenType } from '../parsers/entityDocumentScanner';

export class Configuration extends Entity {

    private _source:string;
    private _output:string;
    private _params:any;
    
    public static parse(settingsAsString:string):Configuration {

        let configuration: Configuration = null;
        return configuration;
    }

    public get hasSource():boolean {
        return this._source && this._source.length > 0;
    }

    public get source():string {
        return this._source;
    }

    public set source(value:string) {
        this._source = value;
    }

    public get hasOutput():boolean {
        return this._output && this._output.length > 0;
    }

    public get output():string {
        return this._output;
    }

    public set output(value:string) {
        this._output = value;
    }

    public get params():any {
        return this._params;
    }

    public set params(params:any) {
        this._params = params;
    }

    public addTextToken(textToken:PropertyToken) {
        super.addTextToken(textToken);

        if(textToken.path) {

            let context = this;
            let steps = textToken.path.split(constant.JsonPathSeperatorChar);
            let lastStepIndex = steps.length - 1; 

            for(let index = 0; index < steps.length; index++) {
                let step = steps[index];

                if(index === lastStepIndex) {

                    if(step.indexOf('[') > -1) {
                        step = step.substring(0, step.indexOf('['));
                    }

                    if(textToken.propertyValueToken.type === TokenType.PropertyValue) {

                        if(Array.isArray(context[step])) {
                            context[step].push(textToken.propertyValueToken.text);
                        } else {
                            context[step] = textToken.propertyValueToken.text;
                        }
                        
                    } else if(textToken.propertyValueToken.type === TokenType.OpenEntity) {
                        if(!context[step]) {
                            context[step] = {}
                        }
                    } else if(textToken.propertyValueToken.type === TokenType.OpenArray) {
                        if(!context[step]) {
                            context[step] = [];
                        }
                    }

                } else {
                    context = context[step];
                }

            }
        }
    }

}