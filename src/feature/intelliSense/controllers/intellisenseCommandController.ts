'use strict'

import * as vscode from 'vscode';
import * as constant from '../../../constant';
import { IEndpoint } from '../models/IEndpoint';
import { Controller } from '../../../controllers/controller';
import { ElasticsearchQueryCompletionManager } from '../managers/elasticsearchQueryCompletionManager';
import { GephiStreamService } from '../../gephi/services/gephiStreamService';
import { IntellisenseGraphManager } from '../managers/intellisenseGraphManager';
import { LogManager } from '../../../managers/logManager';
import { Graph } from '../../../models/graph';

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

        let manager:IntellisenseGraphManager = IntellisenseGraphManager.get();
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

        let manager:IntellisenseGraphManager = IntellisenseGraphManager.get();

        let keys = Object.keys(manager.graphs);
        let key = await vscode.window.showQuickPick(keys, { canPickMany: false });
        let baseUrl = await vscode.window.showInputBox({
            value: 'http://localhost:8080',
            prompt: 'Enter Gephi master server URL'
        });

        let workspace = await vscode.window.showInputBox({
            value: 'workspace1',
            prompt: 'Enter Gephi workspace name'
        });

        if(key && manager.graphs[key]) {
            let graph:Graph = manager.graphs[key];

            LogManager.verbose('Streaming graph %s with %s nodes and %s edges to Gephi', key,
                graph.getNodes().length, graph.getEdges().length);

            let url = baseUrl + '/' + workspace;
            let service = new GephiStreamService(url);
            service.syncGraph(graph);
        }
    }
}
