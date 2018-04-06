'use strict'

export class Retention {

    private _minimumToKeep:number;
    
    public get minimumToKeep():number {
        return this._minimumToKeep;
    }

    public set minimumToKeep(minimumToKeep:number) {
        this._minimumToKeep = minimumToKeep;
    }
}