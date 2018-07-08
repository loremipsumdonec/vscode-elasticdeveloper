'use strict'

import * as vscode from 'vscode';
import * as urlhelper from '../helpers/url';
import { TextToken } from "./textToken";
import { ElasticsearchQueryDocument } from '../parsers/elasticSearchQueryDocument';
import { TokenType } from "../parsers/elasticsearchQueryDocumentScanner";
import { Entity } from './entity';
import { PropertyToken } from './propertyToken';
import { TextStream } from '../parsers/textStream';

export class ElasticsearchQuery extends Entity {

    private _commandSteps = null;

    private _name:string;
    private _method:string;
    private _command:string;
    private _body:string;
    private _bulk:string[] = [];
    private _hasInput:boolean = false;

    public static parse(queryAsString:string, body?:any):ElasticsearchQuery {

        let query: ElasticsearchQuery = null;

        let document = ElasticsearchQueryDocument.parse(queryAsString);

        if(document.queries.length > 0) {
            query = document.queries[0];

            if(body) {
                query.body = JSON.stringify(body, null, 4);
            }
        }

        return query;
    }

    public get hasName():boolean {
        return (this._name && this._name.length > 0);
    }

    public get name():string {
        return this._name;
    }

    public set name(value:string) {
        this._name = value;
    }

    public get hasMethod():boolean {
        return (this._method && this._method.length > 0);
    }

    public get method():string {
        return this._method;
    }

    public set method(value:string) {
        this._method = value;
    }

    public get hasCommand():boolean {
        return (this._command && this._command.length > 0);
    }

    public get command():string {
        return this._command;
    }

    public set command(value:string) {

        if(value && !value.startsWith('/')) {
            value = '/' + value;
        }

        this._command = value;
        this._commandSteps = null;
    }

    public get steps():string[] {

        if(this._commandSteps == null) {
            this._commandSteps = urlhelper.getSteps(this.command);
        }

        return this._commandSteps;
    }

    public get hasInput(): boolean {
        return this._hasInput;
    }

    public get hasBody():boolean {
        return (this._body && this._body.length > 0);
    }

    public get body():string {
        return this._body;
    }

    public set body(value:string) {
        this._body = value;
    }

    public addBody(value:string) {
        
        value = this.stringifySearchTemplateSource(value);

        if(!this.hasBody) {
            this.body = value;
        }

        this._bulk.push(value);
    }

    public get bulk():string[] {
        return this._bulk;
    }

    public  get isBulk() : boolean {
        return this._bulk.length > 1;
    }

    private stringifySearchTemplateSource(inputValue:string):string {

        let output:string = '';
        let stream = new TextStream(inputValue, 0);
        let value = stream.advanceUntilRegEx(/"source"\s*:\s*{/);
        
        if(value) {
            stream.advance(value.length - 1);
            let s = stream.position;
            stream.advanceToJsonObjectEnd();
    
            if(stream.char === '}') {

                let source = JSON.stringify(
                    inputValue.substring(s, stream.position + 1)
                );

                let first = inputValue.substring(0, s);
                let last = inputValue.substring(stream.position + 1);

                output = first + source + last;
            }
        } else {
            output = inputValue;
        }

        return output;
    }

    public addTextToken(textToken:TextToken) {
        super.addTextToken(textToken);

        if(textToken.type === TokenType.Method) {
            this.method = textToken.text;
        } else if(textToken.type === TokenType.Command) {
            this.command = textToken.text;
        } else if(textToken.type === TokenType.Argument) {
            this._hasInput = true;
            let propertyToken = textToken as PropertyToken;

            if(propertyToken.text && propertyToken.propertyValueToken) {
                this[propertyToken.text] = propertyToken.propertyValueToken.text;
            }

        } else if(textToken.type === TokenType.Body) {
            this.addBody(textToken.text);
        }

    }

    public tokenTypeAt(offset:number): TokenType {

        let tokenType:TokenType = TokenType.Empty;

        for(let textToken of this.textTokens) {

            if(textToken.offset <= offset && offset <= textToken.offsetEnd) {
                tokenType = textToken.type;
                break;
            }

        }

        switch(tokenType) {
            case TokenType.Argument:
            case TokenType.ArgumentValue:
                tokenType = TokenType.Input;
                break;
        }

        return tokenType;
    }
}

export function createPingQuery(): ElasticsearchQuery {
    return ElasticsearchQuery.parse('GET /');
}