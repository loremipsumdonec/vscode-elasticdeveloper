import * as assert from 'assert';
import { PropertyToken } from '../models/propertyToken';
import { EntityDocumentScanner, TokenType, ScannerState, Direction } from '../parsers/entityDocumentScanner';

function createScanner(source:string, position:number=0) {
    return new EntityDocumentScanner(source, position);
} 

suite("EnvironmentEntityDocumentScanner.test", () => {

    test("scanUntil_environmentWithHostAndValue_expectedValues", () => {

        let queryAsString = '{ "host": "http://localhost:9200" }';
        let scanner = createScanner(queryAsString);
        let token = scanner.scanUntil(ScannerState.WithinEntity) as PropertyToken;
        
        assert.equal(token.text, 'host');
        assert.equal(token.propertyValueToken.text, 'http://localhost:9200');
    });

    test("scanUntil_environmentWithHostAndValueUsingEqual_expectedValues", () => {

        let queryAsString = '{ "host"= "http://localhost:9200" }';
        let scanner = createScanner(queryAsString);
        let token = scanner.scanUntil(ScannerState.WithinEntity) as PropertyToken;
        
        assert.equal(token.text, 'host');
        assert.equal(token.propertyValueToken.text, 'http://localhost:9200');
    });

    test("calibrate_environmentWithOneProperty_hasExectedStateAndscanUntilReturnCloseEntityToken", () => {

        let queryAsString = '{ "host"= "http://localhost:9200" }';
        let scanner = createScanner(queryAsString, 2);
        scanner.calibrate();

        let token = scanner.scanUntil(ScannerState.WithinContent);
        
        assert.equal(scanner.state, ScannerState.WithinContent);
        assert.equal(token.type, TokenType.CloseEntity);
    });
    
});