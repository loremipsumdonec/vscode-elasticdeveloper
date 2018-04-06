'use strict'

import * as textTokenFactory from "../models/textToken";
import { TextToken } from "../models/textToken";

import { Environment } from "../models/environment";
import { EntityDocumentScanner, ScannerState, TokenType } from "./entityDocumentScanner";

export class EnvironmentDocument {

    private _environments: Environment[];
    private _comments: TextToken[];

    constructor() {
        this._environments = [];
        this._comments = [];
    }

    public get comments(): TextToken[] {
        return this._comments;
    }

    public addComment(comment:TextToken) {
        if(comment) {
            this._comments.push(comment);
        }
    }

    public get environments(): Environment[] {
        return this._environments;
    }

    public addEnvironment(environment:Environment) {
        if(environment) {
            this._environments.push(environment);
        }
    }

    public static parse(text:string): EnvironmentDocument {

        let document = new EnvironmentDocument();

        let scanner = new EntityDocumentScanner(text);
        let token = scanner.scan();
        let environment = null;

        while(token) {

            if(token.type === TokenType.OpenEntity) {
                environment = new Environment();
                environment.addTextToken(token);
                document.addEnvironment(environment);
            } else if(token.type === TokenType.Property) {
                environment.addTextToken(token);
            } else if(token.type == TokenType.Comment) {
                document.addComment(token);
            }

            token = scanner.scan();
        }

        return document;
    }

    public static getCurrentEnvironment(text:string, offset:number): Environment {

        let query = null;
        let scanner = new EntityDocumentScanner(text, offset);
        scanner.calibrate();
        
        return null;
    }
}