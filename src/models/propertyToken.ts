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

    public isInRange(offset:number):boolean {

        let status = super.isInRange(offset);

        if(!status && this.propertyValueToken) {
            return this.propertyValueToken.isInRange(offset);
        }

        return status;
    }

    public tokenAt(offset:number): TextToken {
     
        let token:TextToken = null;

        if(this.isInRange(offset)) {

            if(this.propertyValueToken && this.propertyValueToken.isInRange(offset)) {
                token = this.propertyValueToken;
            } else {
                token = this;
            }

        }

        return token;
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