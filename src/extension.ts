'use strict';

import * as vscode from 'vscode';
import * as constant from './constant';
import * as FileSystemLoaderServiceSpecificationManager from './managers/fileSystemLoaderServiceSpecificationManagerDecorator';
import * as WorkspaceEnvironmentManager from './managers/workspaceEnvironmentManagerDecorator';
import * as HostEnvironmentManager from './managers/hostEnvironmentManagerDecorator';

import { LogManager } from './managers/logManager';
import { EnvironmentManager } from './managers/environmentManager';

import { Controller } from './controllers/controller';
import { QueryCodeLensController} from './controllers/queryCodeLensController';
import { EnvironmentCodeLensController } from './controllers/environmentCodeLensController';
import { EnvironmentCommandController } from './controllers/environmentCommandController';
import { EnvironmentTreeDataProviderController } from './feature/explorer/environmentTreeDataProviderController';
import { IndexTemplateCodeLensController } from './controllers/indexTemplateCodeLensController';
import { IndexTemplateCommandController } from './controllers/indexTemplateCommandController';
import { QueryCompletionItemController } from './feature/intelliSense/controllers/queryCompletionItemController';
import { QueryCommandController } from './controllers/queryCommandController';
import { IndexCommandController } from './controllers/indexCommandController';
import { ScriptCommandController } from './controllers/scriptCommandController';
import { IntellisenseCommandController } from './feature/intelliSense/controllers/intellisenseCommandController';

export function activate(context: vscode.ExtensionContext) {

    let configuration = vscode.workspace.getConfiguration();
    
    LogManager.verbose('elasticdeveloper extension activated');
    LogManager.verbose('elasticdeveloper decorating EnvironmentManager');

    EnvironmentManager.decorateWith(WorkspaceEnvironmentManager.decorate(context));
    EnvironmentManager.decorateWith(HostEnvironmentManager.decorate());
    
    LogManager.verbose('elasticdeveloper loading controllers');

    let controllers: Controller[] = [];
    controllers.push(new QueryCodeLensController());
    controllers.push(new QueryCommandController());
    controllers.push(new QueryCompletionItemController());
    controllers.push(new EnvironmentCodeLensController());
    controllers.push(new EnvironmentCommandController());
    controllers.push(new EnvironmentTreeDataProviderController());
    controllers.push(new IndexTemplateCodeLensController());
    controllers.push(new IndexTemplateCommandController());
    controllers.push(new IndexCommandController());
    controllers.push(new ScriptCommandController());
    controllers.push(new IntellisenseCommandController());

    LogManager.verbose('elasticdeveloper register controllers');

    for(let controller of controllers) {
        controller.register(context);
    }

    EnvironmentManager.init();
    LogManager.verbose('elasticdeveloper done, the extension should now be ready. happy coding!');
}

export function deactivate() {
}