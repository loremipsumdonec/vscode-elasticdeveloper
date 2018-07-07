'use strict';

import * as vscode from 'vscode';
import * as constant from './constant';
import * as FileSystemLoaderServiceSpecificationManager from './managers/fileSystemLoaderServiceSpecificationManagerDecorator';
import * as WorkspaceEnvironmentManager from './managers/workspaceEnvironmentManagerDecorator';
import * as HostEnvironmentManager from './managers/hostEnvironmentManagerDecorator';

import { LogManager } from './managers/logManager';
import { EnvironmentManager } from './managers/environmentManager';
import { ServiceSpecificationManager } from './managers/serviceSpecificationManager';

import { Controller } from './controllers/controller';
import { QueryCodeLensController} from './controllers/queryCodeLensController';
import { EnvironmentCodeLensController } from './controllers/environmentCodeLensController';
import { EnvironmentCommandController } from './controllers/environmentCommandController';
import { EnvironmentTreeDataProviderController } from './feature/explorer/environmentTreeDataProviderController';
import { IndexTemplateCodeLensController } from './controllers/indexTemplateCodeLensController';
import { IndexTemplateCommandController } from './controllers/indexTemplateCommandController';
import { QueryCompletionItemController } from './controllers/queryCompletionItemController';
import { QueryCommandController } from './controllers/queryCommandController';
import { IndexCommandController } from './controllers/indexCommandController';

export function activate(context: vscode.ExtensionContext) {

    let configuration = vscode.workspace.getConfiguration();
    let explorerFeatureEnabled = configuration.get(constant.ConfigurationFeatureExplorerEnabled);

    LogManager.verbose('elasticdeveloper extension activated');
    LogManager.verbose('elasticdeveloper decorating EnvironmentManager');

    EnvironmentManager.decorateWith(WorkspaceEnvironmentManager.decorate(context));
    EnvironmentManager.decorateWith(HostEnvironmentManager.decorate());
    
    ServiceSpecificationManager.decorateWith(FileSystemLoaderServiceSpecificationManager.decorate());
    
    LogManager.verbose('elasticdeveloper loading controllers');
    let controllers: Controller[] = [];
    controllers.push(new QueryCodeLensController());
    controllers.push(new QueryCommandController());
    controllers.push(new QueryCompletionItemController());
    controllers.push(new EnvironmentCodeLensController());
    controllers.push(new EnvironmentCommandController());
    
    if(explorerFeatureEnabled) {
        controllers.push(new EnvironmentTreeDataProviderController());
    }

    controllers.push(new IndexTemplateCodeLensController());
    controllers.push(new IndexTemplateCommandController());
    controllers.push(new IndexCommandController());

    LogManager.verbose('elasticdeveloper register controllers');

    for(let controller of controllers) {
        controller.register(context);
    }

    EnvironmentManager.init();
    LogManager.verbose('elasticdeveloper done, the extension should now be ready. happy coding!');
}

export function deactivate() {
}