'use strict'

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as constant from '../constant';
import * as tmp from 'tmp';
import * as path from 'path';
import * as handlebars from 'Handlebars';

import { LogManager } from '../managers/logManager';
import { Environment } from '../models/environment';
import { Configuration } from '../models/configuration';
import { EnvironmentManager } from '../managers/environmentManager';
import { ElasticsearchResponse } from '../models/elasticSearchResponse';
import { ElasticsearchQuery } from '../models/elasticSearchQuery';
import { ElasticService } from '../services/elasticService';
import { TextToken } from '../models/textToken';

export abstract class Controller {

    protected _context: vscode.ExtensionContext;
    protected _outputChannel: vscode.OutputChannel;

    protected get environment():Environment  {
        return EnvironmentManager.get().environment;
    }

    protected set environment(value:Environment)  {
        this.info(false, 'changing target environment to %s with version %s', value, value.version);
        EnvironmentManager.get().environment = value;
    }

    protected async executeQuery(query: ElasticsearchQuery, environment?: Environment) : Promise<ElasticsearchResponse> {

        if(!environment) {
            environment = this.environment;
        }

        let response: ElasticsearchResponse = null;

        try{

            if(environment) {

                try {
                    response = await ElasticService.execute(query, environment);
                }catch(ex) {
                    response = ex;
                    response.environment = environment;
                }
                
                if(query.hasName) {
                    this.info(false, 'executed query %s %s %s on host %s', query.name, query.method, query.command, environment);
                } else {
                    this.info(false, 'executed query %s %s on host %s', query.method, query.command, environment);
                }
                
        
            } else {
    
                this.warning(false, 'could not find a target environment');
    
                response = {
                    message: 'could not find a target environment',
                    completed: false 
                };
            }

        }catch(ex) {
            this.error(true, 'executeQuery = %s', ex.message);

            response = {
                message: ex.message,
                completed: false 
            };
        }

        return response;
    }

    public register(context: vscode.ExtensionContext) {
        
        this._context = context;
        this.initiate();
    }

    protected initiate() {
        this.registerCommands();
    }

    protected registerCommands() {
    }

    protected getCommand(partialCommand): string {
        return constant.CommandPrefix + '.' + partialCommand;
    }

    protected registerTextEditorCommand(command: string, callback: (textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit, ...args: any[]) => void, thisArg?: any) {

        command = constant.CommandPrefix + '.' + command;

        this.verbose('register text editor command %s', command);

        this._context.subscriptions.push(
            vscode.commands.registerTextEditorCommand(command, callback)
        );

    }

    protected registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any) {
        
        command = constant.CommandPrefix + '.' + command;

        this.verbose('register command %s', command);

        this._context.subscriptions.push(
            vscode.commands.registerCommand(command, callback)
        );
    }

    protected registerCodeLensProvider(languageId: string, provider: vscode.CodeLensProvider) {

        this.verbose('register code lens provider with selector %s', languageId);

        this._context.subscriptions.push(
            vscode.languages.registerCodeLensProvider({ scheme: 'file', language: languageId}, provider)
        );
    }

    protected registerDocumentHighlightProvider(languageId: string, provider: vscode.DocumentHighlightProvider) {
        
        this.verbose('register highlight provider with selector %s', languageId);

        this._context.subscriptions.push(
            vscode.languages.registerDocumentHighlightProvider({ scheme: 'file', language: languageId}, provider)
        );
    }

    protected registerCompletionItemProvider(languageId: string, provider: vscode.CompletionItemProvider, ...triggerCharacters: string[]) {
        
        this.verbose('register completion item provider with selector %s', languageId);
        
        this._context.subscriptions.push(
            vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: languageId}, provider, ...triggerCharacters)
        );
    }

    protected async view(response:any, configuration?:Configuration) {

        if(configuration && configuration.hasOutput) {
            this.verbose('configuration has output %s', configuration.output);

            let outputs:string[] = [];

            let extname = path.extname(configuration.output);
            let basePath = path.dirname(configuration.source);
            let relativePath = path.dirname(configuration.output);

            let extensions = extname.substr(1).split('|')

            for(let extension of extensions) {

                let fileNameWithoutExtension = path.basename(configuration.output, extname);
                let output = path.join(basePath, relativePath,  fileNameWithoutExtension +'.'+ extension);

                switch(extension) {
                    case 'html':
                        this.viewAsHtml(response, configuration.source, output);
                        break
                    case 'json':
                        await this.viewAsJson(response, output);
                        break;
                }

            }

        } else {
            this.verbose('missing configuration will use default output');
            this.viewAsJson(response);
        }

        if(!response.completed) {
            this.warning(false, response.message);
        } else {
            this.verbose('response to %s %s = %s', response.request.method, response.request.uri.path, response.message);
        }
    }

    protected async viewAsJson(model:any, to?:string) {

        try{

            let content = JSON.stringify(model,null, 4);

            if(to) {
                fs.writeFileSync(to, content, 'UTF-8');
            } else {
                to = await this.createTemporaryFileWithContent(content);
                let textDocument:vscode.TextDocument = await vscode.workspace.openTextDocument(to);
                vscode.window.showTextDocument(textDocument, vscode.ViewColumn.Two, true);
            }
            
            this.info(false, 'saved output %s.', to);

        }catch(ex) {
            this.error(false, 'failed to save output as json %s', ex);
        }

    }

    protected async createTemporaryFileWithContent(content:string) : Promise<string> {
        return new Promise<string>((resolve, reject)=> {

            tmp.file({ postfix: '.json'}, (err, tmpFilePath, fd)=> {

                fs.writeFile(tmpFilePath, content, error => {
                    reject(error);
                    return;
                });

                resolve(tmpFilePath);
            });


        });
    }

    protected viewAsHtml(model:any, from:string, to:string) {

        let extension = path.extname(from);
        let dirname = path.dirname(from);
        let fileNameWithoutExtension = path.basename(from, extension);
        let fileTemplateFileName = fileNameWithoutExtension + '.html';
        let fileTemplate = path.join(dirname, fileTemplateFileName);

        try{
            let source = this.loadTextFromFile(fileTemplate);

            if(source) {
                let template = handlebars.compile(source);

                var result = template(model);
    
                fs.writeFileSync(to, result, 'UTF-8');
                this.info(false, 'saved output %s', to)
            } else {
                this.warning(true, 'failed to load input template %s', fileTemplate);
            }

        }catch(ex) {
            this.error(true, 'failed to load input template from %s', fileTemplate,  ex);
        }
        
    }

    protected getFileName(fileName:string, languageId:string) {
        return path.basename(fileName, '.'+languageId);
    }

    protected verbose(message:string, ...args:any[]) {
        LogManager.verbose(message, args);
    }

    protected info(showAsNotification:boolean, message:string, ...args:any[]) {
        LogManager.info(showAsNotification, message, args);
    }

    protected warning(showAsNotification:boolean, message:string, ...args:any[]) {
        LogManager.warning(showAsNotification, message, args);
    }

    protected error(showAsNotification:boolean, message:string, ...args:any[]) {
        LogManager.error(showAsNotification, message, args);
    }

    protected loadTextFromFile(filePath:string) {

        let text = fs.readFileSync(filePath, 'UTF-8');
        return text;
    }

    protected async createTextDocumentWithResponse(model:any): Promise<vscode.TextDocument> {

        let content = JSON.stringify(model,null, 4);
        let path = await this.createTemporaryFileWithContent(content);
        let textDocument:vscode.TextDocument = await vscode.workspace.openTextDocument(path);

        return textDocument;
    }

    protected getActiveDocumentUri(input:any, languageId:string): vscode.Uri {

        let uri: vscode.Uri = null;

        if(input && input.fsPath) {
            uri = input;
        } else if(input && vscode.window.activeTextEditor) {
            
            let activeTextEditor = vscode.window.activeTextEditor;

            if(activeTextEditor.document.languageId === languageId) {
                uri = activeTextEditor.document.uri;
            }
        }

        return uri;
    }

    protected getRangeWithin(textDocument: vscode.TextDocument, token: TextToken): vscode.Range {

        let start = textDocument.positionAt(token.offset);
        let end = textDocument.positionAt(token.offsetEnd);

        let range = new vscode.Range(start, end);

        return range;
    }
}