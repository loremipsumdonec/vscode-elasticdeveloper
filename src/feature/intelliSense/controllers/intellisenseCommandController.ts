'use strict'

import * as vscode from 'vscode';
import * as constant from '../../../constant';
import { IEndpoint } from '../models/IEndpoint';
import { Controller } from '../../../controllers/controller';
import { ElasticsearchQueryCompletionManager } from '../managers/elasticsearchQueryCompletionManager';
import { GephiStreamService } from '../../gephi/services/gephiStreamService';

export class IntellisenseCommandController extends Controller {

    public registerCommands() {

        this.registerCommand(constant.IntelliSenseCommandStreamGraph, 
            (input) => { 
                this.streamGraph(input) 
            });

        this.registerCommand(constant.IntelliSenseCodeLensCommandOpenEndpointDocumentation,
            (input) => {
                this.openEndpointDocumentation(input)
            });
    }

    private async openEndpointDocumentation(endpointId:string) {

        let manager:ElasticsearchQueryCompletionManager = ElasticsearchQueryCompletionManager.get();
        let endpoint:IEndpoint = manager.getEndpointWithId(endpointId);
    
        if(endpoint && endpoint.documentation) {
            let url = endpoint.documentation;

            if(url.indexOf('/master/')) {
                url = url.replace('/master/', '/'+ manager.versionNumber + '/');
            }

            vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
        }
    }

    private async streamGraph(input:any) {

        let manager:ElasticsearchQueryCompletionManager = ElasticsearchQueryCompletionManager.get();

        console.log('yee needd to select cool graf..');
        let keys = Object.keys(manager.graphs);

        let key = await vscode.window.showQuickPick(keys, { canPickMany: false });
        
        if(key && manager.graphs[key]) {
            console.log('stream graph ... %s', key);

            let service = new GephiStreamService();
            service.syncGraph(manager.graphs[key]);
        }
        
    }
}