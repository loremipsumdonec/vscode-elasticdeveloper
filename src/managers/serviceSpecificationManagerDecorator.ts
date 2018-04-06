'use strict'

import { SpecificationItem } from "../models/specificationItem";
import { ServiceSpecificationManager } from "./serviceSpecificationManager";

export abstract class ServiceSpecificationManagerDecorator extends ServiceSpecificationManager {

    private _manager:ServiceSpecificationManager;

    constructor(manager:ServiceSpecificationManager) {
        super()

        this._manager = manager;
    }

    public getSuggestionsWithMethod(method:string, command:string):SpecificationItem[] {
        return this._manager.getSuggestionsWithMethod(method, command);
    }

    public clearSpecificationItems() {
        this._manager.clearSpecificationItems();
    }

    public addSpecificationItem(specificationItem:SpecificationItem) {
        this._manager.addSpecificationItem(specificationItem);
    }
}
