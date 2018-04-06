'use strict'

import * as vscode from 'vscode';
import { HttpService } from '../services/httpService';
import { Environment } from "../models/environment";
import { Index } from '../models/index';

var _environmentManager:EnvironmentManager;

export class EnvironmentManager {

    private _observers:any[] = [];
    private _environment:Environment;
    private _indices:Index[] = [];
    private _aliases:Index[] = [];
    private _httpService:HttpService
    private _workFolder:string;

    public get workFolder():string {

        if(!this._workFolder) {
            this._workFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
        }

        return this._workFolder;
    }

    public get httpService():HttpService {

        if(!this._httpService) {
            this._httpService = new HttpService(8001, this.workFolder);
        }

        return this._httpService;

    }

    public get environment(): Environment {
        return this._environment;
    }

    public set environment(value:Environment) {
        this._environment = value;
        this.notifyObservers('environment.changed');
    }

    public get indices(): Index[] {
        return this._indices;
    }

    public addIndex(index:Index) {

        if(index) {
           let exists = this._indices.find(i=> i.id === index.id);
            
            if(!exists) {
                this._indices.push(index);
                this.notifyObservers('index.added');
            }        
        }
    }

    public addIndices(indices:Index[]) {
        
        for(let index of indices) {
            
            if(index) {
                let exists = this._indices.find(i=> i.id === index.id);
            
                if(!exists) {
                    this._indices.push(index);
                }   
            }
         }

         this.notifyObservers('index.added');
    }

    public get aliases(): Index[] {
        return this._aliases;
    }

    public addAlias(alias:Index) {

        if(alias) {
           let exists = this._indices.find(i=> i.id === alias.id);
            
            if(!exists) {
                this._aliases.push(alias);
                this.notifyObservers('alias.added');
            }        
        }
    }

    public addAliases(aliases:Index[]) {
        
        for(let alias of aliases) {
            
            if(alias) {
                let exists = this._indices.find(i=> i.id === alias.id);
            
                if(!exists) {
                    this._aliases.push(alias);
                }   
            }
         }

         this.notifyObservers('alias.added');
    }

    private notifyObservers(eventName) {

        let environmentManager = EnvironmentManager.get();

        for(let observer of environmentManager._observers) {
            observer.call(observer, eventName, this);
        }

    }

    public static get(): EnvironmentManager {

        if(!_environmentManager) {
            _environmentManager = new EnvironmentManager();
        }
    
        return _environmentManager;
    }
    
    public static init() {
        let environmentManager = this.get();
        let forceLoadEnv = environmentManager.environment;
    }

    public static decorateWith(decorate:any) {
    
        let environmentManager = this.get();
        _environmentManager = decorate(environmentManager);
    }

    public static subscribe(observer:any) {
        let environmentManager = this.get();
        environmentManager._observers.push(observer);
    }

    public static unsubscribe() {
    }

    public static indices():Index[]  {
        let environmentManager = this.get();
        return environmentManager.indices;
    }

}
