'use strict'

import { Entity } from "./entity";
import { PropertyToken } from "./propertyToken";
import { TokenType } from "../parsers/entityDocumentScanner";
import { EnvironmentDocument } from "../parsers/environmentDocument";
import { Version } from "./version";

export class Environment extends Entity {

    private _name:string;
    private _version:Version = null;
    private _host:string;
    private _userAgent:string;
    
    public static hydrate(environmentAsObject:any):Environment {

        let environment: Environment = new Environment();
        environment.host = environmentAsObject._host;
        environment.name = environmentAsObject._name;
        environment.userAgent = environmentAsObject._userAgent;
        environment.version = Version.hydrate(environmentAsObject._version);

        return environment;
    }

    public static parse(environmentAsString:string):Environment {

        let environment: Environment = null;

        let document = EnvironmentDocument.parse(environmentAsString);

        if(document.environments.length > 0) {
            environment = document.environments[0];
        }

        return environment;
    }

    public get id():string {
        return this.name;
    }

    public get hasName(): boolean {
        return (this._name && this._name.length > 0);
    }

    public get name():string {
        return this._name;
    }

    public set name(value:string) {
        this._name = value;
    }

    public get hasVersion():boolean {
        return (this._version != null);
    }

    public get version():Version {
        return this._version;
    }

    public set version(value:Version) {
        this._version = value;
    }

    public get host():string {
        return this._host;
    }

    public set host(host:string) {
        this._host = host;
    }

    public get hasHost():boolean {
        return (this._host && this._host.length > 0);
    }

    public get userAgent():string {
        return this._userAgent;
    }

    public set userAgent(userAgent:string) {
        this._userAgent = userAgent;
    }

    public get hasUserAgent():boolean {
        return (this._userAgent && this._userAgent.length > 0);
    }

    public addTextToken(textToken:PropertyToken) {
        
        super.addTextToken(textToken);

        if(textToken.type == TokenType.Property) {

            let propertyName = textToken.text.toLocaleLowerCase();

            switch(propertyName) {

                case "host":
                    this.host = textToken.propertyValueToken.text;
                    break;
                case "name":
                    this.name = textToken.propertyValueToken.text;
                    break;
                case "useragent":
                    this.userAgent = textToken.propertyValueToken.text;
                    break;
            }

        }

    }

    public toString(): string {
        return this.host + ' ('+ this.name +')';
    }
}
