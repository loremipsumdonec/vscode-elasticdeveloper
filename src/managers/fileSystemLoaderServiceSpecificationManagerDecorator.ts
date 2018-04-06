'use strict'

import * as vscode from 'vscode'
import * as constant from '../constant';
import * as fs from 'fs';
import * as path from 'path'
import * as urlhelper from '../helpers/url';
import { SpecificationItem } from "../models/specificationItem";
import { ServiceSpecificationManagerDecorator } from "./serviceSpecificationManagerDecorator";
import { ServiceSpecificationManager } from './serviceSpecificationManager';
import { EnvironmentManager } from './environmentManager';
import { Version } from '../models/version';
import { LogManager } from './logManager';

export class FileSystemLoaderServiceSpecificationManagerDecorator extends ServiceSpecificationManagerDecorator {

    constructor(manager:ServiceSpecificationManager) {
        super(manager)

        EnvironmentManager.subscribe(this.onEnvironmentManagerChanged.bind(this));
    }
    
    public load() {
        
        this.clearSpecificationItems();
        let folderPath:string = this.getFolderPath();

        if(folderPath) {
            let files = fs.readdirSync(folderPath);
            let loaded = 0;
            for(let i = 0; i < files.length; i++) {
    
                let filename = files[i];
                const extension = path.extname(filename);
                
                if(extension === '.json') {
                    
                    const filePath = folderPath + '\\' + filename;
                    let specificationItems = this.loadSpecificationItemFromFile(filePath);

                    for(let specificationItem of specificationItems) {
                        this.addSpecificationItem(specificationItem);
                        loaded++;
                    }
                    
                }
            }

            LogManager.verbose('loaded %s specification items from %s', loaded, folderPath);


        } else {
            //warning could not find a rest-api-spec for this version...
        } 
    }

    public loadSpecificationItemFromFile(file:string):SpecificationItem[] {

        let specificationItems:SpecificationItem[] = [];
        let sourceItem:SpecificationItem = null;

        try {

            const fileContent = fs.readFileSync(file, 'UTF-8');
            sourceItem = JSON.parse(fileContent);

            if(sourceItem) {
                let sourceItemId = Object.keys(sourceItem)[0];

                sourceItem = sourceItem[sourceItemId];
                sourceItem.id = sourceItemId.replace('.', '_');

                if(sourceItem instanceof Object) {
                    specificationItems.push(sourceItem);
                }
            }

        } catch(ex) {
            LogManager.warning(false, ex.message);
        }

        return specificationItems;
    }

    private build(path:string, sourceItem:SpecificationItem): SpecificationItem[] {
        
        let items:SpecificationItem[] = [];
        let steps = urlhelper.getSteps(path);
                            
        for(let depth = 0; depth < 1; depth++) {

            let specificationItem = JSON.parse(JSON.stringify(sourceItem));
            let p = steps.slice(0, steps.length).join('/');
            
            specificationItem.url.path = p;
            specificationItem.depth = depth;
            items.push(specificationItem);
        }

        return items;
    }

    private getFolderPath():string {

        let folderPath = '';
        let environment = EnvironmentManager.get().environment;

        if(environment && environment.hasVersion) {

            let extension = vscode.extensions.getExtension(constant.ExtensionId);
            folderPath =  extension.extensionPath +  '\\resources\\rest-api-spec';

            let folders = fs.readdirSync(folderPath)
                .filter(
                    f=> fs.statSync(path.join(folderPath, f)).isDirectory()
                );

            let closest = Version.getClosest(environment.version, folders);

            if(closest) {
                folderPath = folderPath + '\\' + closest.toString();
            } else {
                folderPath = null;
            }
        }

        return folderPath;

    }

    private onEnvironmentManagerChanged(eventName, manager:EnvironmentManager) {
        
        if(eventName === 'environment.changed') {
            this.load();
        }

    }

}

export function decorate() {

    return (manager) => {
        let decoratedManager = new FileSystemLoaderServiceSpecificationManagerDecorator(manager);

        return decoratedManager;
    }
}
