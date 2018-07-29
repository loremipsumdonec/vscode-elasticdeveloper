'use strict'

export class TextToken {

    private _type:number;
    private _offset: number;
    private _index: number = 0;
    private _path:string;
    private _text:string;
    private _isValid:boolean = true;

    public get isValid():boolean {
        return this._isValid;
    }

    public set isValid(value:boolean) {
        this._isValid = value;
    }

    public get type():number {
        return this._type;
    }

    public set type(value:number) {
        this._type = value;
    }

    public get offset():number {
        return this._offset;
    }

    public set offset(offset:number) {
        this._offset = offset;
    }

    public get offsetEnd():number {

        if(this.hasText) {
            return this._offset + this._text.length;
        }

        return this._offset;
    }

    public get index():number {
        return this._index;
    }

    public set index(index:number) {
        this._index = index;
    }

    public get path():string {
        return this._path;
    }

    public set path(value:string) {
        this._path = value;
    }

    public get text():string {
        return this._text;
    }

    public set text(value:string) {
        this._text = value;
    }

    public get hasText():boolean {
        return (this._text && this._text.length > 0);
    }

    public isInRange(offset:number):boolean {
        return this.offset <= offset && offset <= this.offsetEnd
    }
}

export function createTextToken(text:string, offset:number, type:number):TextToken {
    
    let textToken = new TextToken();
    textToken.text = text;
    textToken.offset = offset;
    textToken.type = type;

    return textToken;
}