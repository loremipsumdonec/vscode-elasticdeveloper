'use strict'

import { Entity } from "./entity";
import { PropertyToken } from "./propertyToken";
import { TokenType } from "../parsers/entityDocumentScanner";

export class IndexTemplate extends Entity {

    private _name:string;
    private _template:string;
    private _index_pattern:string[];
    private _version:number;
    private _order:number;
    private _mappings:any = {};
    private _settings:any = {};
    private _aliases:any = {};

    constructor() {
        super();
    }

    public get hasName():boolean {
        return this.name && this.name.length > 0;
    }

    public get name():string {
        return this._name;
    }

    public set name(name:string) {
        this._name = name;
    }

    public get template():string {
        return this._template;
    }

    public set template(template:string) {
        this._template = template;
    }

    public get index_pattern():string[] {
        return this._index_pattern;
    }

    public set index_pattern(pattern:string[]) {
        this._index_pattern = pattern;
    }

    public get version():number {
        return this._version;
    }

    public set version(version:number) {
        this._version = version;
    }

    public get order():number {
        return this._order;
    }

    public set order(order:number) {
        this._order = order;
    }

    public get aliases():any {
        return this._aliases;
    }

    public get settings():any {
        return this._settings;
    }

    public get mappings():any {
        return this._mappings;
    }

    public addTextToken(textToken:PropertyToken) {
        super.addTextToken(textToken);

        if(textToken.path) {

            let context = this;
            let steps = textToken.path.split('.');
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

    public toJSON() {

        let index_pattern;

        if(this.index_pattern && this.index_pattern.length > 0) {
            index_pattern = this.index_pattern;
        }

        return {
            template: this.template,
            index_pattern: index_pattern,
            version: this.version,
            settings: this.settings,
            mappings: this.mappings,
            aliases: this.aliases
        };
    }
}