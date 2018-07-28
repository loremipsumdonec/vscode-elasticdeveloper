'use strict'

import * as stringhelper from "../helpers/string";
import * as textTokenFactory from "../models/textToken";
import * as propertyTokenFactory from "../models/propertyToken";

import { TextStream, TextStreamDirection } from "./textStream";
import { TextToken } from "../models/textToken";
import { PropertyToken } from "../models/propertyToken";
import { EntityDocumentScanner, TokenType as EntityTokenType } from "./entityDocumentScanner";

export enum Direction {
    Forward,
    Backward
}

export enum ScannerState {
    Unknown,
    WithinContent,
    WithinComment,
    WithinConfiguration,
    AfterMethod,
    AfterCommand,
    WithinQueryString,
    AfterQueryStringName,
    BeforeQueryStringValue,
    AfterQueryString,
    WithinInput,
    AfterArgumentName,
    BeforeArgumentValue,
    AfterInput,
    AfterStartBody,
    AfterBody
}

export enum TokenType {
    Comment,
    Configuration,
    Command,
    Method,
    Input,
    Argument,
    ArgumentValue,
    Body,
    Empty
}

export class ElasticsearchQueryDocumentScanner {

    private _direction:Direction;
    private _source:string;
    private _stream:TextStream;
    private _state:ScannerState;
    private _detailState:ScannerState;
    private _entityDocumentScanner:EntityDocumentScanner
    
    constructor(source:string, position:number=0) {

        this._source = source;
        this._stream = new TextStream(source, position);

        if(position > 0) {
            this._state = ScannerState.Unknown;
        } else {
            this._state = ScannerState.WithinContent;
        }

        this._detailState = ScannerState.Unknown;
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

    public scan():TextToken {

        if(this._state === ScannerState.Unknown) {
            this.calibrate();
        }
        
        let token = this.getNextToken();
        return token;
    }

    public scanUntil(state:ScannerState, detailState:ScannerState = ScannerState.Unknown):TextToken  {

        let token = null;

        while(this.isNotEndOfStream && this.state != state) {
            token = this.scan();

            if(detailState != ScannerState.Unknown && detailState == this._detailState) {
                break;
            }

            if(this.state != state) {
                token = null;
            }
        }

        return token;
    }

    public calibrate() {

        let withinQuery = false;
        let position = this._stream.position;
        let value = this._stream.retreatToTheClosest([/\}/, /\)/, /\/\s/, /\s(DAEH|TUP|ETELED|TSOP|TEG)/i]);
        
        if(value === '}') {
            // we can still be within a body, so we need to count the start and closing tags.
            this._state = ScannerState.WithinContent;
            this._stream.advance(this._stream.position - position);
        } else if(value === '{ ') {
            withinQuery = true;
            this._state = ScannerState.AfterStartBody;
        } else if(value === '( ') {
            withinQuery = true;
            this._state = ScannerState.AfterInput;
        } else if(value === ')') {
            
            let currentPosition = this._stream.position;
            value = this._stream.advanceUntilNonWhitespace(1);

            if(!value || (value && value === '{')) {
                this._state = ScannerState.AfterInput;
                withinQuery = true;
                this._stream.retreat(this._stream.position - currentPosition);
            } else {
                this._state = ScannerState.WithinContent;
                this._stream.advance(this._stream.position - currentPosition);
            }

        } else if(value === '/ ') {
            withinQuery = true;
            this._state = ScannerState.AfterMethod;
        } else if(value && value.length > 0) {
            withinQuery = true;
            this._state = ScannerState.WithinContent;            
        } else {
            this._state = ScannerState.WithinContent;
            this._stream.advance(this._stream.position - position);
        }

        if(withinQuery) {
            if(this._state === ScannerState.WithinContent) {
                this._stream.retreat(value.length);
            } else {
                value = this._stream.retreatToTheClosest([/\s(DAEH|TUP|ETELED|TSOP|TEG)/i]);
            
                if(value && value.length > 0) {
                    this._state = ScannerState.WithinContent;
                    this._stream.retreat(value.length);
                }
            }
        }
    }

    private getNextToken():TextToken {

        let token = null;

        if(this._state == ScannerState.AfterCommand) {
            if(this._stream.char === '(') {
                this._state = ScannerState.WithinInput;
            } else if(this._stream.char === '?') {
                this._state = ScannerState.WithinQueryString
            }
        }

        switch(this._state) {
            case ScannerState.WithinContent:
            case ScannerState.Unknown:

                this._stream.advanceUntilNonWhitespace();

                if(this._stream.char === '/') {
                    token = this.getCommentToken();
                } else if(this._stream.char === '{') {
                    token = this.getConfigurationToken();
                } else {
                    token = this.getMethodToken();
                }
                
                break;
            case ScannerState.WithinConfiguration:
                token = this.getConfigurationToken();
                break;
            case ScannerState.AfterMethod:
                token = this.getCommandToken();
                break;
            case ScannerState.WithinQueryString:
                token = this.getQueryStringToken();
                break;
            case ScannerState.WithinInput:
                token = this.getArgumentToken();
                break;
            case ScannerState.AfterInput:
            case ScannerState.AfterCommand:
                token = this.getBodyToken();
                break;
        }

        return token;
    }

    private getPreviousToken(): TextToken {

        let token = null;

        if(this._state === ScannerState.WithinContent) {
            this._stream.advanceUntil([/\}/, /\(/, /\s\//, /(DAEH|TUP|ETELED|TSOP|TEG)\s/i]);

            if(this._stream.char === '}') {
                this._state = ScannerState.AfterBody;
            } else if(this._stream.char === ')') {
                this._state = ScannerState.AfterInput;
            } else if(this._stream.char === '/') {
                this._state = ScannerState.AfterMethod;
            } else {
                this._state = ScannerState.WithinContent;
            }
        }

        switch(this._state) {
            case ScannerState.WithinContent:
            case ScannerState.Unknown:
                break;
            case ScannerState.AfterMethod:
                token = this.getCommandToken();
                break;
            case ScannerState.WithinInput:
                token = this.getArgumentToken();
                break;
            case ScannerState.AfterBody:
                token = this.getBodyTokenInBackward();
                break;
        }

        return token;
    }

    private getCommentToken(): TextToken {
        
        let token:TextToken = null;

        let start = 0;
        let value = '';

        this._stream.advance();

        if(this._stream.char === '*') {

            this._state = ScannerState.WithinComment;
            start = this._stream.position - 1;

            value = this._stream.advanceUntilRegEx(/\*\/\s+/, true, 2);

            if(value) {

                token = textTokenFactory.createTextToken('/' + value, start, TokenType.Comment);
                this._state = ScannerState.WithinContent;
            }

        }

        return token;
    }

    private getConfigurationToken(): TextToken {

        let token:TextToken = null;

        if(this._state === ScannerState.WithinContent && this._stream.char === '{') {
            this._state = ScannerState.WithinConfiguration;
            this._entityDocumentScanner = new EntityDocumentScanner(this._source, this._stream.position);
        }
        
        token = this._entityDocumentScanner.scan();

        if(token != null) {

            if(token.type === EntityTokenType.CloseEntity) {
                this._state = ScannerState.WithinContent;
                let steps = this._entityDocumentScanner.offset - this.offset;
                this._stream.advance(steps);
            }
        } else {
            this._state = ScannerState.WithinContent;
        }

        return token;
    }

    public getPreviousMethodToken(): TextToken {

        let token = null;

        if(this._state === ScannerState.AfterMethod) {

            this._stream.direction = TextStreamDirection.Backward;
            let method = this._stream.advanceUntilRegEx(/DAEH|TUP|ETELED|TSOP|TEG/i);

            if(method) {

                token = textTokenFactory.createTextToken(method, this._stream.position, TokenType.Method);
                this._state = ScannerState.AfterMethod;
            }


            this._stream.direction = TextStreamDirection.Forward;
        }

        return token;
    }

    private getMethodToken(): TextToken {

        let token = null;
        let method = this._stream.advanceUntilRegEx(/GET|POST|DELETE|PUT|HEAD/i);

        if(method) {

            token = textTokenFactory.createTextToken(method, this._stream.position, TokenType.Method);

            this._stream.advance(method.length);
            this._state = ScannerState.AfterMethod;
            this._stream.advanceUntilNonWhitespace();
        }

        return token;
    }

    private getCommandToken(): TextToken {

        let token = null;
        let command = this._stream.advanceUntilRegEx(/[^\?|\(|\{|\n|\s]+/);

        if(command) {

            this._stream.advance(command.length);
            let lengthBeforeTrim = command.length;

            command = stringhelper.rtrim(command);

            token = textTokenFactory.createTextToken(
                command, 
                this._stream.position - lengthBeforeTrim, 
                TokenType.Command);

            this._stream.advanceUntilNonWhitespace();

            if(this._stream.char === '?' || this._stream.char === '(' || this._stream.char === '{') {
                this._state = ScannerState.AfterCommand;
            } else if(this._stream.position > token.offsetEnd) {
                this._state = ScannerState.WithinContent;
            } else {
                this._state = ScannerState.AfterCommand;
            }
        }

        return token;

    }

    private getQueryStringToken():PropertyToken {

        let token = null;

        if(this.isNotEndOfStream) {

            if(this._stream.char === '?' || this._stream.char === '&') {
                this._stream.advance();
                let argumentName = this._stream.advanceUntilRegEx(/[\=]/, true);
    
                token = propertyTokenFactory.createPropertyToken(
                    argumentName, 
                    this._stream.position - argumentName.length,
                    TokenType.Argument
                );
    
                token.propertyValueToken = this.getQueryStringValueToken();
                this._stream.advanceUntilNonWhitespace();
            }
    
            if(this._stream.char == '(' || this._stream.char == '{') {
                this._state = ScannerState.AfterQueryString
            } else {
                this._state = ScannerState.WithinQueryString
            }

        }

        return token;
    }

    private getArgumentToken(): PropertyToken {

        let token = null;

        this._stream.advance();
        let value = this._stream.advanceToTheClosest([/\)/, /\S/]);

        if(value !== ')' && !this._stream.endOfStream) {
            
            let argumentName = this._stream.advanceUntilRegEx(/[\:|\=]/, true);

            token = propertyTokenFactory.createPropertyToken(
                argumentName, 
                this._stream.position - value.length,
                TokenType.Argument
            );

            token.propertyValueToken = this.getArgumentValueToken();
            this._stream.advanceUntilNonWhitespace();

        } else {
            token = textTokenFactory.createTextToken(null, 0, TokenType.Empty);
        }
        
        if(this._stream.char == ')') {

            this._stream.advanceUntilNonWhitespace(1);
            let openingTag = '{';

            if(this._stream.char == openingTag) {
                this._state = ScannerState.AfterInput;
            } else {
                this._state = ScannerState.WithinContent;
            }

        } else {
            this._state = ScannerState.WithinInput;
        }

        return token;
    }

    private getQueryStringValueToken(): TextToken {

        let token = null;
        this._stream.advanceUntilNonWhitespace(1);
        let value = this._stream.advanceUntilRegEx(/[\&|\(|\{|\n)]/, true);

        if(value) {
            token = textTokenFactory.createTextToken(
                value, 
                this._stream.position - value.length, 
                TokenType.ArgumentValue);
        }

        return token;
    }

    private getArgumentValueToken(): TextToken {

        let token = null;

        this._stream.advance();
        this._stream.advanceUntilNonWhitespace();

        if(this._stream.char === '"') {
            token = this.getArgumentStringValueToken();
        } else {
            token = this.getArgumentNumberValueToken();
        }

        return token;
    }

    private getArgumentStringValueToken(): TextToken {

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
                    TokenType.ArgumentValue);

                this._stream.advance();
                break;
            }

            this._stream.advance();
        }

        return token;

    }

    private getArgumentNumberValueToken(): TextToken {

        let token = null;
        let value = '';

        while(!this._stream.endOfStream) {

            if(this._stream.char !== ' ' && this._stream.char !== ',' && this._stream.char !== ')') {
                value += this._stream.char;
            } else {

                token = textTokenFactory.createTextToken(
                    value, 
                    this._stream.position - value.length, 
                    TokenType.ArgumentValue);

                break;
            }

            this._stream.advance();
        }

        return token;

    }

    private getBodyTokenInBackward(): TextToken {

        let token = this.getBodyToken('}', '{');

        if(token) {
            token.text = token.text.split('').reverse().join('');
            this._stream.advanceUntilNonWhitespace();

            if(!this._stream.endOfStream) {

                if(this._stream.char === ')') {
                    this._state = ScannerState.AfterInput;
                } else {
                    this._state = ScannerState.AfterCommand;
                }
            }

        }

        return token;
    }

    private getBodyToken(openingChar='{', closingChar='}'): TextToken {

        let token = null;
        let startTagsTicks = 0;
        let body = '';

        while(!this._stream.endOfStream) {

            let char = this._stream.char;
            body += char;

            if(char === openingChar) { 

                if(this._state === ScannerState.AfterCommand) {
                    this._state = ScannerState.AfterStartBody;
                }

                startTagsTicks++;

            } else if(char === closingChar) {
                startTagsTicks--;

                if(startTagsTicks === 0) {
                    this._state = ScannerState.AfterBody;
                    this._stream.advance();
                    break;
                }
            }

            this._stream.advance();
        }

        token = textTokenFactory.createTextToken(
            body, 
            this._stream.position - body.length,
            TokenType.Body);

        if(this._state === ScannerState.AfterBody) {

            this._stream.advanceUntilNonWhitespace();

            if(this._stream.char === '{') {
                this._state = ScannerState.AfterCommand;
            } else {
                this._state = ScannerState.WithinContent;
            }
        } else {
            token.isValid = false;
            this._state = ScannerState.WithinContent;
        }

        return token;
    }
}