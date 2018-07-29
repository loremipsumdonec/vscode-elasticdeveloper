'use strict'

import * as urlhelper from '../helpers/url';
import { TextToken } from "./textToken";
import { ElasticsearchQueryDocument } from '../parsers/elasticSearchQueryDocument';
import { TokenType } from "../parsers/elasticsearchQueryDocumentScanner";
import { Entity } from './entity';
import { PropertyToken } from './propertyToken';
import { TextStream } from '../parsers/textStream';
import { ElasticsearchResponse } from './elasticSearchResponse';
import { Environment } from './environment';
import { ElasticService } from '../services/elasticService';

export class ElasticsearchQuery extends Entity {

    private _commandSteps = null;

    private _name:string;
    private _method:string;
    private _command:string;
    private _endpointId:string;
    private _body:string;
    private _bulk:string[] = [];
    private _hasInput:boolean = false;
    private _hasValidBody = undefined;
    private _options = {};

    private _offset:number = -1;
    private _offsetEnd:number = -1;

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

    public getUrl():string {
        let url = this._command;

        let keys = Object.keys(this._options);

        for(let index = 0; index < keys.length; index++) {
            let key = keys[index];
            let value = this._options[key];
            let keyValue = key + '="' + value + '"';

            if(!value) {
                keyValue = key;
            }

            if(index === 0) {
                url += '?' + keyValue;
            } else {
                url += '&' + keyValue;
            }
        }

        return url;
    }

    public get hasEndpointId(): boolean {
        return (this._endpointId && this._endpointId.length > 0);
    }

    public get endpointId():string {
        return this._endpointId;
    }

    public set endpointId(value:string) {
        this._endpointId = value;
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

    public get hasValidBody(): boolean {

        if(this._hasValidBody == null) {
            let exists = this.textTokens.find(t=> t.type === TokenType.Body && !t.isValid);
            this._hasValidBody = exists == null;
        }

        return this._hasValidBody;
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
        this._hasValidBody = undefined;
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

    private refreshRange(textToken:TextToken) {

        let propertyToken:PropertyToken = textToken as PropertyToken;

        if(this._offset === -1 || this._offset > textToken.offset) {
            this._offset = textToken.offset;
        }

        if(this._offsetEnd < textToken.offsetEnd) {
            this._offsetEnd = textToken.offsetEnd;
        }

        if(propertyToken && propertyToken.propertyValueToken) {
            if(this._offsetEnd < propertyToken.propertyValueToken.offsetEnd) {
                this._offsetEnd = propertyToken.propertyValueToken.offsetEnd;
            }
        }
    }

    public addTextToken(textToken:TextToken) {
        super.addTextToken(textToken);
        this.refreshRange(textToken);

        if(textToken.type === TokenType.Method) {
            this.method = textToken.text;
        } else if(textToken.type === TokenType.Command) {
            this.command = textToken.text;
        } else if(textToken.type === TokenType.QueryString) {
            let propertyToken = textToken as PropertyToken;

            if(propertyToken.text && propertyToken.propertyValueToken) {
                this._options[propertyToken.text] = propertyToken.propertyValueToken.text;
            } else if(propertyToken.text) {
                this._options[propertyToken.text] = null;
            }

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

        for(let token of this.textTokens) {

            if(token.isInRange(offset)) {
                tokenType = token.type;
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

    public tokenAt(offset:number): TextToken {
     
        let token:TextToken = null;

        for(let textToken of this.textTokens) {
            
            if(textToken as PropertyToken) {
                
                if(textToken.isInRange(offset)) {
                    token = textToken;
                }
                
            } else {

                if(textToken.isInRange(offset)) {
                    token = textToken;
                }
            }

        }

        return token;
    }

    public isInRange(offset:number):boolean {

        let status = offset >= this._offset && offset <= this._offsetEnd;
        return status;
    }
}

export function createPingQuery(): ElasticsearchQuery {
    return ElasticsearchQuery.parse('GET /');
}

export async function executeQuery(query:ElasticsearchQuery, environment:Environment): Promise<ElasticsearchResponse> {

    let response:ElasticsearchResponse = null;

    try {
        response = await ElasticService.execute(query, environment);
    }catch(ex) {
        response = ex;
        response.environment = environment;
    }

    return response;
}