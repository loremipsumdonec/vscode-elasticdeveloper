'use strict'

import { EnvironmentManager } from './environmentManager';
import { Environment } from "../models/environment";
import { Index } from '../models/index';

export abstract class EnvironmentManagerDecorator extends EnvironmentManager {

    protected _environmentManager:EnvironmentManager;

    constructor(environmentManager:EnvironmentManager) {
        super()

        this._environmentManager = environmentManager;
    }

    public get environment(): Environment {
        return this._environmentManager.environment;
    }

    public set environment(value:Environment) {
        this._environmentManager.environment = value;
    }

    public get indices(): Index[] {
        return this._environmentManager.indices;
    }

    public addIndex(index:Index) {
        this._environmentManager.addIndex(index);
    }

    public addIndices(indices:Index[]) {
        this._environmentManager.addIndices(indices);
    }

}