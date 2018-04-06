'use strict'

import * as vscode from 'vscode';
import * as constant from '../constant';

import { IndexTemplateController } from './indexTemplateController';
import { IndexTemplateDocument } from '../parsers/indexTemplateDocument';
import { PropertyToken } from '../models/propertyToken';
import { TokenType } from '../parsers/entityDocumentScanner';

export class IndexTemplateDocumentHighlightController extends IndexTemplateController 
    implements vscode.DocumentHighlightProvider {

    public registerCommands() {
        this.registerDocumentHighlightProvider(constant.IndexTemplateDocumentSelector, this);
    }

    public provideDocumentHighlights(textDocument: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.DocumentHighlight[]> {
    
        let highlights:vscode.DocumentHighlight[] = [];

        try
        {
            let text = textDocument.getText();
            let indexTemplateDocument = IndexTemplateDocument.parse(text);
    
            for(let indexTemplate of indexTemplateDocument.indexTemplates) {
    
                let asJson = JSON.stringify(indexTemplate, null, 4);

                for(let textToken of indexTemplate.textTokens) {
    
                    let propertyToken:PropertyToken = textToken as PropertyToken;
    
                    if(textToken.type === TokenType.Property) {
    
                        let propertyNameTokenRange = this.getRangeWithin(textDocument, propertyToken);
                        let propertyNameHighlight = new vscode.DocumentHighlight(propertyNameTokenRange, vscode.DocumentHighlightKind.Read);
                        highlights.push(propertyNameHighlight);
    
                        if(propertyToken.propertyValueToken && propertyToken.propertyValueToken.text) {
    
                            let propertyValueRange = this.getRangeWithin(textDocument, propertyToken.propertyValueToken as PropertyToken);
                            let propertyValueHighlight = new vscode.DocumentHighlight(propertyValueRange, vscode.DocumentHighlightKind.Text);
                            highlights.push(propertyValueHighlight);
    
                        }
    
                    }
    
                }
            }

        }catch(ex) {
            console.log(ex);
        }

        return highlights;
    }

}