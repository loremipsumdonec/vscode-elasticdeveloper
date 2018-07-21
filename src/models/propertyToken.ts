'use strict'

import { TextToken } from "./textToken";

export class PropertyToken extends TextToken {

    private _propertyValueToken:TextToken;
    private _propertyValueType:number;

    public get propertyValueToken():TextToken {
        return this._propertyValueToken;
    }

    public set propertyValueToken(value:TextToken) {
        this._propertyValueToken = value;
    }

    public get propertyValueType():number {
        return this._propertyValueType;
    }

    public set propertyValueType(value:number) {
        this._propertyValueType = value;
    }

}

export function createPropertyToken(text:string, offset:number, type:number, propertyValueType?:number):PropertyToken {
    
    let propertyToken = new PropertyToken();
    propertyToken.text = text;
    propertyToken.offset = offset;
    propertyToken.type = type;
    propertyToken.propertyValueType = propertyValueType;

    return propertyToken;
}