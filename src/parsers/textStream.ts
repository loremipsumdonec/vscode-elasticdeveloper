'use strict'

export enum TextStreamDirection {
    Forward,
    Backward
}

export class TextStream {

    private _source:string;
    private _length:number;
    private _position:number;
    private _direction:TextStreamDirection;
    
    constructor(source:string, position:number=0) {
        this._source = source;
        this._position = position;
        this._length = source.length;
    }

    public get direction():TextStreamDirection {
        return this._direction;
    }

    public set direction(direction:TextStreamDirection) {

        if(this._direction !== direction) {
            this.reverse();
            this._direction = direction;
        }
    }

    private reverse() {
        this._source = this._source.split('').reverse().join('');

        if(this._direction == TextStreamDirection.Backward) {
            this._position = this._length - this._position - 1;
        } else {
            this._position = this._length - this._position - 1;
        }

        if(this._position < 0 ) {
            this._position = 0;
        }
    }

    public get startOfStream():boolean {
        return this._length === 0;
    }

    public get endOfStream():boolean {
        return this._length <= this._position;
    }

    public get position() {
        return this._position;
    }

    public set position(value:number) {
        this._position = value;
    }

    public get char(): string {
        return this._source[this.position];
    }

    public retreat(n:number = 1) {
        this._position -= n;

        if(this._position < 0) {
            this._position = 0;
        }
    }

    public advance(n:number = 1) {
        this._position += n;
    }

    public retreatToTheClosest(patterns:RegExp[]): string {

        this.direction = TextStreamDirection.Backward;
        let value = this.advanceToTheClosest(patterns);
        this.direction = TextStreamDirection.Forward;

        return value;
    }

    public advanceToTheClosest(patterns:RegExp[]): string {

        let currentIndex = -1;
        let value = ''
        let content = this._source.substr(this._position);

        for(let regex of patterns) {
            
            let match = content.match(regex);

            if(match && (match.index < currentIndex || currentIndex === -1)) { 
                value = match[0];
                currentIndex = match.index;
            }
        }

        if(currentIndex > -1) {
            this.position = this.position + currentIndex;
        }

        return value;
    }

    public advanceUntil(patterns:RegExp[]): string {

        let value = ''
        let content = this._source.substr(this._position);

        for(let regex of patterns) {
            let match = content.match(regex);

            if(match) { 
                value = match[0];
                this.position = this.position + match.index;

                break;
            }

        }

        return value;
    }

    public advanceUntilNonWhitespace(offset:number = 0): string {
        this.advance(offset);
        return this.advanceUntilRegEx(/\S/);
    }

    public advanceUntilRegEx(regex: RegExp, returnBeforeMatch:boolean=false, offsetMatchValue:number=0) :string {

        let value = '';
        let content = this._source.substr(this._position);
        let match = content.match(regex);

        if(match) {

            if(returnBeforeMatch) {
                value = content.substring(0, match.index + offsetMatchValue);
            } else {
                value = match[0];
            }

            this.position = this.position + match.index + offsetMatchValue;

        } else {
            this.advanceToEnd();
        }

        return this.turnValueInRightDirection(value);

    }

    public advanceToEnd() {
        this._position = this._length;
    }

    private turnValueInRightDirection(value:string):string {

        let valueAtRightDirection = value;

        if(value && this._direction === TextStreamDirection.Backward) {
            valueAtRightDirection = value.split('').reverse().join('');
        }

        return valueAtRightDirection;

    }

}