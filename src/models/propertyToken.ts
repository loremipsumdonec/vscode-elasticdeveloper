'use strict'

import { TextToken } from "./textToken";

export class PropertyToken extends TextToken {

    private _propertyValueToken:TextToken;

    public get propertyValueToken():TextToken {
        return this._propertyValueToken;
    }

    public set propertyValueToken(value:TextToken) {
        this._propertyValueToken = value;
    }

}

export function createPropertyToken(text:string, offset:number, type:number, 
    propertyValueText?:string, propertyValueOffset?:number, propertyValueType?:number):PropertyToken {
    
    let propertyToken = new PropertyToken();
    propertyToken.text = text;
    propertyToken.offset = offset;
    propertyToken.type = type;

    return propertyToken;
}