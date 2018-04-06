'use strict'

export function getSteps(url:string):string[] {

    if(url && url.length > 0) {

        if(url.startsWith('/')) {
            return url.substring(1).split('/');
        } else {
            return url.split('/');
        }
        
    } else {
        return [];
    }
}