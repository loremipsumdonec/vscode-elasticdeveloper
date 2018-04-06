'use strict'

import * as vscode from 'vscode';

var _logManager:LogManager;

export class LogManager {

    protected _outputChannel: vscode.OutputChannel;

    constructor() {
        this._outputChannel = vscode.window.createOutputChannel('elasticdeveloper');
    }

    public static verbose(message:string, ...args:any[]) {
        let logManager = LogManager.get();
        logManager.log(false, 'verbose', message, args);
    }

    public static info(showAsNotification:boolean, message:string, ...args:any[]) {
        let logManager = LogManager.get();
        logManager.log(showAsNotification, 'info', message, args);
    }

    public static warning(showAsNotification:boolean, message:string, ...args:any[]) {
        let logManager = LogManager.get();
        logManager.log(showAsNotification, 'warning', message, args);
    }

    public static error(showAsNotification:boolean, message:string, ...args:any[]) {
        let logManager = LogManager.get();
        logManager.log(showAsNotification, 'error', message, args);
    }

    public log(showAsNotification:boolean, type:string, message:string, args) {

        if(message) {

            let position = message.indexOf('%s')
    
            if(position > -1) {
    
                if(Array.isArray(args[0])) {
                    args = args[0];
                }
    
                for(let index in args) {
                    
                    let value = args[index];
    
                    if(!value) {
                        value = '';
                    }

                    message = message.replace('%s', value);
                }
            }
        
            this._outputChannel.appendLine('['+ type +'] ' + message);
    
            if(showAsNotification) {
                this.showNotification(type, message);
            }

        }

    }

    protected showNotification(type:string, message:string) {

        switch(type) {
            case 'info':
                vscode.window.showInformationMessage(message);
                break;
            case 'warning':
                vscode.window.showWarningMessage(message);
                break;
            case 'error':
                vscode.window.showErrorMessage(message);
                break;
        }

    }

    public static get(): LogManager {

        if(!_logManager) {
            _logManager = new LogManager();
        }
    
        return _logManager;
    }

}