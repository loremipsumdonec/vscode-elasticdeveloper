'use strict'

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class HttpService {

    private _outputChannel:vscode.OutputChannel;
    private _portNumber:number;
    private _rootFolder:string;

    constructor(portNumber:number, rootFolder:string) {
        this._outputChannel = vscode.window.createOutputChannel('Elasticdeveloper HTTP');
        this._portNumber = portNumber;
        this._rootFolder = path.join(rootFolder, '.wwwroot');
    }

    public async start() {
        this.log('We are naow ready tooo start...');
        this.createRoot();
    }

    public async stop() {
        this.log('we are now ready 2 STOP!!');
    }

    private createRoot() {

        try
        {
            if (!fs.existsSync(this._rootFolder)) {
                fs.mkdirSync(this._rootFolder);
            }

        }catch(ex) {
            console.log(ex);
        }

    }

    private log(message:string) {
        this._outputChannel.appendLine(message);
    }

}