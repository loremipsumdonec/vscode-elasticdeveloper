'use strict'

import * as textTokenFactory from '../models/textToken';
import * as entityDocumentScannerFactory from './entityDocumentScanner'

import { TextToken } from '../models/textToken';
import { ElasticsearchQuery } from '../models/elasticsearchQuery';
import { Configuration } from '../models/configuration';
import { ElasticsearchQueryDocumentScanner, ScannerState, TokenType } from './elasticsearchQueryDocumentScanner';
import { LogManager } from '../managers/logManager';

export class ElasticsearchQueryDocument {

    private _configurations: Configuration[];
    private _queries: ElasticsearchQuery[];
    private _comments: TextToken[];

    constructor() {
        this._configurations = [];
        this._queries = [];
        this._comments = [];
    }

    public get hasConfigurations(): boolean {
        return this._configurations && this.configurations.length > 0;
    }

    public get configurations(): Configuration[] {
        return this._configurations;
    }

    public addConfiguration(configuration:Configuration) {
        if(configuration) {
            this._configurations.push(configuration);
        }
    }

    public get hasComments(): boolean {
        return this._comments && this._comments.length > 0;
    }

    public get comments(): TextToken[] {
        return this._comments;
    }

    public addComment(comment:TextToken) {
        if(comment) {
            this._comments.push(comment);
        }
    }

    public get hasQueries(): boolean {
        return this._queries && this._queries.length > 0;
    }

    public get queries(): ElasticsearchQuery[] {
        return this._queries;
    }

    public addQuery(query:ElasticsearchQuery) {
        if(query) {
            this._queries.push(query);
        }
    }

    public static parse(text:string): ElasticsearchQueryDocument {

        let document = new ElasticsearchQueryDocument();

        try{

            let scanner = new ElasticsearchQueryDocumentScanner(text);
            let token = scanner.scan();
            let currentQuery = null;
            let configuration = null;
    
            while(token) {
    
                if(scanner.state !== ScannerState.WithinConfiguration) {
                    if(token.type === TokenType.Method) {
                        currentQuery = new ElasticsearchQuery();
                        currentQuery.addTextToken(token);
                        document.addQuery(currentQuery);
                    } else if(token.type === TokenType.Command) {
                        currentQuery.addTextToken(token);
                    } else if(token.type === TokenType.Argument) {
                        currentQuery.addTextToken(token);
                    } else if(token.type === TokenType.Body) {
                        this.applyConfigurationParametersOn(token, configuration);
                        currentQuery.addTextToken(token);
                    } else if(token.type == TokenType.Comment) {
                        document.addComment(token);
                    } 
                } else {
    
                    if(token.type === entityDocumentScannerFactory.TokenType.OpenEntity) {
                        configuration = new Configuration();
                        configuration.addTextToken(token);
                        document.addConfiguration(configuration);
                    } else if(token.type === entityDocumentScannerFactory.TokenType.Property) {
                        configuration.addTextToken(token);
                    }
    
                }
    
                token = scanner.scan();
            }

        }catch(ex) {
            LogManager.error(false, 'failed parse ElasticSearchQueryDocument %s', ex.message);
        }

        return document;
    }

    public static getQueryWithOffset(offset:number, text:string): ElasticsearchQuery {

        let query:ElasticsearchQuery = null;
        let document = ElasticsearchQueryDocument.parse(text);

        if(document.queries.length > 0) {

            for(let current of document.queries) {
                let first = current.textTokens[0];
                let last = current.textTokens[current.textTokens.length - 1];

                if(first.offset <= offset && offset <= last.offsetEnd) {
                    query = current;
                    break;
                }
            }
        }

        return query;
    }

    private static applyConfigurationParametersOn(bodyToken:TextToken, configuration:Configuration) {

        if(configuration && configuration.params) {

            for(let name in configuration.params) {
                let key = '{{' + name + '}}';

                /** 
                 *  don’t know why I need two of these in some cases.. ¯\_(ツ)_/¯. 
                 *  It's always fun with more
                 */
                bodyToken.text = bodyToken.text.replace(key, configuration.params[name]);
                bodyToken.text = bodyToken.text.replace(key, configuration.params[name]);
            }
        }

    }
}