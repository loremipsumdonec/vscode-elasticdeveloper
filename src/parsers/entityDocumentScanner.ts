'use strict'

import * as textTokenFactory from "../models/textToken";
import * as propertyTokenFactory from "../models/propertyToken";
import { TextStream, TextStreamDirection } from "./textStream";
import { TextToken } from "../models/textToken";
import { PropertyToken } from "../models/propertyToken";

export enum Direction {
    Forward,
    Backward
}

export enum ScannerState {
    Unknown,
    WithinContent,
    AfterOpenEntity,
    WithinEntity
}

export enum TokenType {
    OpenEntity,
    CloseEntity,
    OpenArray,
    CloseArray,
    Property,
    PropertyValue,
    Comment
}

export class EntityDocumentScanner {

    protected _direction:Direction;
    protected _stream:TextStream;
    protected _state:ScannerState;
    protected _steps:PropertyToken[] = [];

    constructor(source:string, position:number=0) {
        
        this._stream = new TextStream(source, position);

        if(position > 0) {
            this._state = ScannerState.Unknown;
        } else {
            this._state = ScannerState.WithinContent;
        }
    }

    public get offset():number {
        return this._stream.position;
    }

    public get isNotEndOfStream(): boolean {
        return !this._stream.endOfStream;
    }

    public isOffsetWithinRange(offset:number) {
        return !(this.offset >= offset)
    }

    public get state(): ScannerState {
        return this._state;
    }

    public calibrate() {

        let withinEntity = false;
        let position = this._stream.position;

        if(this._stream.char === '{') {
            this._state = ScannerState.WithinContent;
        } else {

            let value = this._stream.retreatToTheClosest([/\{/]);

                if(value === '{') {
                    this._state = ScannerState.AfterOpenEntity;
                    withinEntity = true;
                }

        }

    }

    public scan(): TextToken {

        if(this._state === ScannerState.Unknown) {
            this.calibrate();
        }

        let token = this.getNextToken();
        return token;
    }

    public scanUntilPath(path:String): TextToken {

        let token = null;

        while(this.isNotEndOfStream) {
            token = this.scan();

            if(token.path === path) {
                break;
            } else {
                token = null;
            }
        }

        return token;

    }

    public scanUntilPosition(position:number): TextToken {

        let token = null;

        while(this.isNotEndOfStream) {
            token = this.scan();

            if(this._stream.position >= position) {
                break;
            } else {
                token = null;
            }
        }

        return token;

    }

    public scanUntil(state:ScannerState, detailState:ScannerState = ScannerState.Unknown):TextToken  {

        let token = null;

        while(this.isNotEndOfStream && this.state != state) {
            token = this.scan();

            if(this.state != state) {
                token = null;
            }
        }

        return token;
    }

    private getNextToken(): TextToken {

        let token = null;

        switch(this._state) {
            case ScannerState.WithinContent:
                token = this.getOpenEntityToken();
                break;
            case ScannerState.AfterOpenEntity:
            case ScannerState.WithinEntity:

                if(this._stream.char !== '}' || this._steps.length > 0) {
                    token = this.getPropertyToken();
                } else {
                    token = this.getCloseEntityToken();
                }
                
                break;
        }


        return token;
    }

    private getOpenEntityToken(): TextToken {
        let token = null;

        let value = this._stream.advanceUntilRegEx(/\{/);

        if(value) {
            token = textTokenFactory.createTextToken(null, this._stream.position, TokenType.OpenEntity);
            this._state = ScannerState.AfterOpenEntity;
        }

        return token;
    }

    private getPropertyToken(): PropertyToken {

        let token = null;

        if(!this._stream.endOfStream) {
            
            if(this.isInsideArray()) {

                this._stream.advanceUntilNonWhitespace();

                let current = this._steps[this._steps.length -1];
                let value = '[' + (current.index++) + ']';

                token = propertyTokenFactory.createPropertyToken(
                    value, 
                    current.offset,
                    TokenType.Property
                );

                token.path = this.getPropertyPath() + value;
                token.propertyValueToken = this.getPropertyValueToken();

                if(token.propertyValueToken) {
        
                    switch(token.propertyValueToken.type) {
                        case TokenType.OpenEntity:
                            this._steps.push(token);
                            break;
                    }
    
                }

                if(token.propertyValueToken.type === TokenType.CloseArray) {
                    this._steps.pop();
                }

            } else {

                let value = this._stream.advanceToTheClosest([/\}/, /\"/]);

                if(value !== '}') {
    
                    this._stream.advance();
                    value = this._stream.advanceUntilRegEx(/\"/, true);
        
                    token = propertyTokenFactory.createPropertyToken(
                        value, 
                        this._stream.position - value.length,
                        TokenType.Property
                    );
        
                    token.path = this.getPropertyPath(value);
        
                    this._stream.advanceUntilRegEx(/[\:|\=]/);
                    token.propertyValueToken = this.getPropertyValueToken();
        
                    if(token.propertyValueToken) {
        
                        switch(token.propertyValueToken.type) {
                            case TokenType.OpenEntity:
                            case TokenType.OpenArray:
                                this._steps.push(token);
                                break;
                        }
        
                    }
        
                    this._state = ScannerState.WithinEntity
    
                } else if(this._steps.length > 0) {
                    
                    let closingToken = this._steps.pop();
    
                    token = propertyTokenFactory.createPropertyToken(
                        closingToken.text, 
                        closingToken.offset,
                        TokenType.Property
                    );

                    if(this.isInsideArray()) {
                        token.path = this.getPropertyPath();
                    } else {
                        token.path = this.getPropertyPath(closingToken.text);
                    }
                    
                    token.propertyValueToken = this.getPropertyValueToken();
                    this._state = ScannerState.WithinEntity
    
                } else {
                    token = this.getCloseEntityToken();
                }

                /* **/
            }
        }

        return token;
    }

    public getPropertyPath(propertyName = ''):string {

        let path = '';

        if(this._steps.length > 0) {

            for(let step of this._steps) {

                let seperator = '.';

                if(step.text.startsWith('[')) {
                    seperator = '';
                }

                if(path) {
                    path = path + seperator + step.text;
                } else {
                    path = step.text;
                }

            }

            if(propertyName) {

                if(propertyName.startsWith('[')) {
                    path = path = path + propertyName;
                } else {
                    path = path = path + '.' + propertyName;
                }

            }

        } else {
            path = propertyName;
        }

        return path;
    }

    private getPropertyValueToken(): TextToken {

        let token = null;

        if(!this.isInsideArray() && !this.isAtEntityEnd()) {
            this._stream.advanceUntilNonWhitespace(1);
        }

        if(this._stream.char === '"') {
            token = this.getPropertyStringValueToken();
        } else if(this._stream.char === '{' || this._stream.char === '}') {
            token = this.getPropertyObjectValueToken();
        } else if(this._stream.char === '[' || this._stream.char === ']') {
            token = this.getPropertyArrayValueToken();
        } else {
            token = this.getPropertyNumberValueToken();
        }

        if(this.isInsideArray()) {

            if(this._stream.char === ',') {
                this._stream.advanceUntilNonWhitespace(1);
            }

        } else {
            this._stream.advanceUntilNonWhitespace();
        }
        
        this._state = ScannerState.WithinEntity;

        return token;
    }

    private getPropertyObjectValueToken(): TextToken {

        let token = null;

        let tokenType = TokenType.OpenEntity;

        if(this._stream.char === '}') {
            tokenType = TokenType.CloseEntity;
        }

        token = textTokenFactory.createTextToken(
            null, 
            this._stream.position, 
            tokenType);

        this._stream.advance();

        return token;
    }

    private getPropertyArrayValueToken(): TextToken {

        let token = null;

        let tokenType = TokenType.OpenArray;

        if(this._stream.char === ']') {
            tokenType = TokenType.CloseArray;
        }

        token = textTokenFactory.createTextToken(
            null, 
            this._stream.position, 
            tokenType);

        this._stream.advance();

        return token;
    }

    private getPropertyStringValueToken(): TextToken {

        let token = null;
        let value = '';

        this._stream.advance();

        while(!this._stream.endOfStream) {

            if(this._stream.char !== '"') {
                value += this._stream.char;
            } else {

                token = textTokenFactory.createTextToken(
                    value, 
                    this._stream.position - value.length, 
                    TokenType.PropertyValue);

                this._stream.advance();
                break;
            }

            this._stream.advance();
        }

        return token;

    }

    private getPropertyNumberValueToken(): TextToken {

        let token = null;
        let value = '';

        while(!this._stream.endOfStream) {

            /**TODO I think i can make this better.. ..but I want to do more "fun stuff" not right now. :) */
            if(this._stream.char !== ' ' && this._stream.char !== '\n' && this._stream.char !== '\r' && this._stream.char !== ',' 
                    && this._stream.char !== ')' && this._stream.char !== '}' && this._stream.char !== ']' ) {
                value += this._stream.char;
            } else {

                token = textTokenFactory.createTextToken(
                    value, 
                    this._stream.position - value.length, 
                    TokenType.PropertyValue);

                break;
            }

            this._stream.advance();
        }

        return token;

    }

    private getCloseEntityToken(): TextToken {
        let token = null;

        let value = this._stream.advanceUntilRegEx(/\}/);

        if(value) {
            token = textTokenFactory.createTextToken(null, this._stream.position, TokenType.CloseEntity);
            
            this._stream.advanceUntilNonWhitespace(1);
            this._state = ScannerState.WithinContent;
        }

        return token;
    }

    private isInsideArray():boolean {

        let status: boolean = false;
        
        if(this._steps.length > 0) {
            let lastIndex = this._steps.length - 1;
            status = this._steps[lastIndex].propertyValueToken.type === TokenType.OpenArray
        }

        return status;
    }

    private isAtEntityEnd(): boolean {
        return this._stream.char === '}';
    }
}