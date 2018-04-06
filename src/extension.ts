'use strict';

import * as vscode from 'vscode';
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

import { IndexTemplateCodeLensController } from './controllers/indexTemplateCodeLensController';
import { IndexTemplateCommandController } from './controllers/indexTemplateCommandController';
import { IndexTemplateDocumentHighlightController } from './controllers/indexTemplateDocumentHighlightController';
import { QueryCompletionItemController } from './controllers/queryCompletionItemController';
import { QueryCommandController } from './controllers/queryCommandController';

export function activate(context: vscode.ExtensionContext) {

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
    controllers.push(new IndexTemplateCodeLensController());
    controllers.push(new IndexTemplateCommandController());

    LogManager.verbose('elasticdeveloper register controllers');

    for(let controller of controllers) {
        controller.register(context);
    }

    EnvironmentManager.init();
    LogManager.verbose('elasticdeveloper done, the extension should now be ready. happy coding!');
}

export function deactivate() {
}