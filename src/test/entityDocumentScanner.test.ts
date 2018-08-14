import * as assert from 'assert';
import { PropertyToken } from '../models/propertyToken';
import { EntityDocumentScanner, TokenType, ScannerState, Direction } from '../parsers/entityDocumentScanner';

function createScanner(source:string, position:number=0) {
    return new EntityDocumentScanner(source, position);
} 

suite("EntityDocumentScanner.test", () => {

    test("scanUntilPath_objectWithPropertyObjectValue_openEntityExpected", () => {

        let entityAsString = '{ "lorem": { "ipsum": 5 } }';
        let scanner = createScanner(entityAsString);
        let token = scanner.scanUntilPath("lorem") as PropertyToken;
        
        assert.equal(token.text, 'lorem');
        assert.equal(token.propertyValueToken.type, TokenType.OpenEntity);
    });

    test("scanUntilPath_objectWithPropertyObject_exectedNumericValue", () => {

        let entityAsString = '{ "lorem": { "ipsum": 56 } }';
        let scanner = createScanner(entityAsString);
        let token = scanner.scanUntilPath("lorem/ipsum") as PropertyToken;
        
        assert.equal(token.text, 'ipsum');
        assert.equal(token.propertyValueToken.text, 56);
    });

    test("scanUntilPath_objectWithPropertyObject_closeEntityExpected", () => {

        let entityAsString = '{ "lorem": { "ipsum": 56 } }';
        let scanner = createScanner(entityAsString);
        let t = scanner.scanUntilPath("lorem/ipsum") as PropertyToken;
        let token = scanner.scan() as PropertyToken;

        assert.equal(token.text, 'lorem');
        assert.equal(token.propertyValueToken.type, TokenType.CloseEntity);
    });

    test("scanUntilPath_objectWithThreeObjectLevels_exectedStringValue", () => {

        let entityAsString = '{ "lorem": { "ipsum": 56, "donec": { "durp": "hello world" } } }';
        let scanner = createScanner(entityAsString);
        let token = scanner.scanUntilPath("lorem/donec/durp") as PropertyToken;

        assert.equal(token.text, 'durp');
        assert.equal(token.propertyValueToken.text, "hello world");
    });

    test("scanUntilPath_objectWithNumericyArray_openArrayExpected", () => {

        let entityAsString = '{ "lorem": [1,2,3,4,5,6,7] }';
        let scanner = createScanner(entityAsString);
        let token = scanner.scanUntilPath("lorem") as PropertyToken;

        assert.equal(token.text, 'lorem');
        assert.equal(token.propertyValueToken.type, TokenType.OpenArray);
    });
    
    test("scanUntilPath_objectWithNumericArray_expectedNumericValue", () => {

        let entityAsString = '{ "lorem": [1,2,3,4,5,6,7] }';
        let scanner = createScanner(entityAsString);
        let token = scanner.scanUntilPath("lorem[1]") as PropertyToken;

        assert.equal(token.path, "lorem[1]");
        assert.equal(token.propertyValueToken.text, 2);
    });

    test("scanUntilPath_objectWithObjectArray_expectedNumericValue", () => {

        let entityAsString = '{ "lorem": [{"donec": 16 }, {"donec": 34}] }';
        let scanner = createScanner(entityAsString);
        let token = scanner.scanUntilPath("lorem[1]/donec") as PropertyToken;

        assert.equal(token.path, "lorem[1]/donec");
        assert.equal(token.propertyValueToken.text, 34);
    });

    test("scanUntilPath_objectWithObjectArrayWithArray_expectedNumericValue", () => {

        let entityAsString = '{ "lorem": [{"donec": 16, "ipsum":[1,2,3,4] }, {"donec": 34, "ipsum":[1,267,3,4]}] }';
        let scanner = createScanner(entityAsString);
        let token = scanner.scanUntilPath("lorem[1]/ipsum[1]") as PropertyToken;

        assert.equal(token.path, "lorem[1]/ipsum[1]");
        assert.equal(token.propertyValueToken.text, 267);
    });

    test("scanUntilPath_objectWithChainingEntityEnd_expectedPathFromFollowingOpenEntity", () => {

        let mapping = {
            properties: {
                preamble: {
                    fields: {
                    }
                },
                title: {
                }
            }
        }

        let mappingAsJson = JSON.stringify(mapping);

        let scanner = createScanner(mappingAsJson);
        let token = scanner.scanUntilPath("properties/title") as PropertyToken;

        assert.equal(token.path, "properties/title");
    });
});