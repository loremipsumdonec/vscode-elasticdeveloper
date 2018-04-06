'use strict'

import * as vscode from 'vscode';
import * as path from 'path'

export async function openAndParseJsonFile(filePath: string): Promise<any> {

    let object = null;

    try
    {
        let textDocument = await vscode.workspace.openTextDocument(filePath);

        if(!textDocument.isDirty) {

            object = JSON.parse(
                textDocument.getText()
            );
            
        } else {

            let message = 'file has changed and is not saved (isDirty) ' + filePath;
            throw new Error(message);
        }

    }
    catch(ex){
        let message = 'failed parse file ' + filePath + ' ' + ex.message;
        throw new Error(message);
    }

    return object;
}

export function getFileNameWithoutExtension (filePath: string) {

    let filename = path.basename(filePath);
    return filename.replace(path.extname(filename), '');

}