'use strict'

import * as textTokenFactory from "../models/textToken";
import { TextToken } from "../models/textToken";

import { IndexTemplate } from "../models/indexTemplate";
import { EntityDocumentScanner, ScannerState, TokenType } from "./entityDocumentScanner";
import { LogManager } from "../managers/logManager";

export class IndexTemplateDocument {

    private _indexTemplates: IndexTemplate[];
    private _comments: TextToken[];

    constructor() {
        this._indexTemplates = [];
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

    public get indexTemplates(): IndexTemplate[] {
        return this._indexTemplates;
    }

    public addIndexTemplate(indexTemplate:IndexTemplate) {
        if(indexTemplate) {
            this._indexTemplates.push(indexTemplate);
        }
    }

    public static parse(text:string): IndexTemplateDocument {

        let document = new IndexTemplateDocument();

        try{

            let scanner = new EntityDocumentScanner(text);
            let token = scanner.scan();
            let indexTemplate = null;
    
            while(token) {
    
                if(token.type === TokenType.OpenEntity) {
                    indexTemplate = new IndexTemplate();
                    indexTemplate.addTextToken(token);
                    document.addIndexTemplate(indexTemplate);
                } else if(token.type === TokenType.Property) {
                    indexTemplate.addTextToken(token);
                } else if(token.type == TokenType.Comment) {
                    document.addComment(token);
                }
    
                token = scanner.scan();
            }

        }catch(ex) {
            LogManager.warning(false, ex.message);
        }

        return document;
    }
}