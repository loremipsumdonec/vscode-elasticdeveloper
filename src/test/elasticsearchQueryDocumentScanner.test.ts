import * as assert from 'assert';
import { ElasticsearchQueryDocumentScanner, TokenType, ScannerState, Direction } from '../parsers/elasticsearchQueryDocumentScanner';
import { PropertyToken } from '../models/propertyToken';

suite("ElasticsearchQueryDocumentScanner", () => {

    test("scanUntil_queryWithBody_expectedCommand", () => {

        let queryAsString = 'GET /lorem/command\n\r{}';
        let scanner = new ElasticsearchQueryDocumentScanner(queryAsString);
        let token = scanner.scanUntil(ScannerState.AfterCommand);
        
        assert.equal(token.text, '/lorem/command');
    });

    test("scanUntil_queryWithBody_expectedScannerOffset", () => {

        let queryAsString = 'GET /lorem/command\n\r{}';
        let scanner = new ElasticsearchQueryDocumentScanner(queryAsString);
        let token = scanner.scanUntil(ScannerState.AfterCommand);
        
        assert.equal(scanner.offset, 20);
    });

    test("scanUntil_queryWithInput_expectedCommand", () => {

        let queryAsString = 'GET /lorem/command()\n\r{}';
        let scanner = new ElasticsearchQueryDocumentScanner(queryAsString);
        let token = scanner.scanUntil(ScannerState.AfterCommand);
        
        assert.equal(token.text, '/lorem/command');
    });

    test("scanUntil_queryWithInput_expectedScannerOffset", () => {

        let queryAsString = 'GET /lorem/command()\n\r{}';
        let scanner = new ElasticsearchQueryDocumentScanner(queryAsString);
        let token = scanner.scanUntil(ScannerState.AfterCommand);
        
        assert.equal(scanner.offset, 18);
    });

    test("scanUntilAfterQueryString_queryWithQueryString_expectedQueryStringName", () => {

        let queryAsString = 'GET /lorem/command?helloQueryString=world\n\r{}';
        let scanner = new ElasticsearchQueryDocumentScanner(queryAsString);
        let token = scanner.scanUntil(ScannerState.AfterQueryString);
        
        assert.equal(token.text, 'helloQueryString');
    }); 

    test("scanUntilAfterQueryString_queryWithQueryString_expectedQueryStringValue", () => {

        let queryAsString = 'GET /lorem/command?helloQueryString=world\n\r{}';
        let scanner = new ElasticsearchQueryDocumentScanner(queryAsString);
        let token = scanner.scanUntil(ScannerState.AfterQueryString) as PropertyToken;
        
        assert.equal(token.propertyValueToken.text, 'world');
    }); 

    test("scanUntilAfterQueryString_queryWithTwoQueryStringParameters_expectedQueryStringNameAndValue", () => {

        let queryAsString = 'GET /lorem/command?helloQueryString=world&lorem=ipsum\n\r{}';
        let scanner = new ElasticsearchQueryDocumentScanner(queryAsString);
        let token = scanner.scanUntil(ScannerState.AfterQueryString) as PropertyToken;;
        
        assert.equal(token.text, 'lorem');
        assert.equal(token.propertyValueToken.text, 'ipsum');
    }); 

    test("scanUntilAfterArgumentName_queryWitArgumentUsingEqualChar_expectedArgumentName", () => {

        let queryAsString = 'GET /lorem/command(helloUsingEqual=5)\n\r{}';
        let scanner = new ElasticsearchQueryDocumentScanner(queryAsString);
        let token = scanner.scanUntil(ScannerState.AfterInput);
        
        assert.equal(token.text, 'helloUsingEqual');
    }); 
    
    test("scanUntilAfterArgumentName_queryWitArgumentUsingColonChar_expectedArgumentName", () => {

        let queryAsString = 'GET /lorem/command(helloUsingColon:5)\n\r{}';
        let scanner = new ElasticsearchQueryDocumentScanner(queryAsString);
        let token = scanner.scanUntil(ScannerState.AfterInput);
        
        assert.equal(token.text, 'helloUsingColon');
    });

    test("scanUntilAfterArgumentName_queryWitArgumentUsingColonCharAndNumberValue_expectedArgumentValue", () => {

        let queryAsString = 'GET /lorem/command(helloUsingColon:5)\n\r{}';
        let scanner = new ElasticsearchQueryDocumentScanner(queryAsString);
        let token = scanner.scanUntil(ScannerState.AfterInput) as PropertyToken;
        
        assert.equal(token.propertyValueToken.text, 5);
    });

    test("scanUntilAfterArgumentName_queryWitArgumentUsingEqualCharAndNumberValue_expectedArgumentValue", () => {

        let queryAsString = 'GET /lorem/command(helloUsingEqual=5)\n\r{}';
        let scanner = new ElasticsearchQueryDocumentScanner(queryAsString);
        let token = scanner.scanUntil(ScannerState.AfterInput) as PropertyToken;;
      
        assert.equal(token.propertyValueToken.text, 5);
    });
    
    test("scanUntilAfterArgumentName_queryWitArgumentUsingEqualCharAndTextValue_expectedArgumentValue", () => {

        let queryAsString = 'GET /lorem/command(helloUsingEqual="Hello world")\n\r{}';
        let scanner = new ElasticsearchQueryDocumentScanner(queryAsString);
        let token = scanner.scanUntil(ScannerState.AfterInput) as PropertyToken;
    
        assert.equal(token.propertyValueToken.text, 'Hello world');
    });

    test("scanUntilAfterArgumentName_queryWitArgumentUsingColonCharAndTextValue_expectedArgumentValue", () => {

        let queryAsString = 'GET /lorem/command(helloUsingColon:"Hello world")\n\r{}';
        let scanner = new ElasticsearchQueryDocumentScanner(queryAsString);
        let token = scanner.scanUntil(ScannerState.AfterInput) as PropertyToken;
        
        assert.equal(token.propertyValueToken.text, "Hello world");
    });

    test("scanUntilAfterArgumentName_queryWitTwoArgumentsReturnSecondArgumentName_expectedArgumentName", () => {

        let queryAsString = 'GET /lorem/command(helloUsingColon:"Hello world", ipsum:5)\n\r{}';
        let scanner = new ElasticsearchQueryDocumentScanner(queryAsString);
        scanner.scanUntil(ScannerState.WithinInput);
        let token = scanner.scan() as PropertyToken;
        
        assert.equal(token.text, "ipsum");
    });

    test("scanUntilAfterArgumentName_queryWitTwoArgumentsReturnSecondArgumentValue_expectedArgumentValue", () => {

        let queryAsString = 'GET /lorem/command(helloUsingColon:"Hello world", ipsum:5)\n\r{}';
        let scanner = new ElasticsearchQueryDocumentScanner(queryAsString);
        scanner.scanUntil(ScannerState.WithinInput);
        let token = scanner.scan() as PropertyToken;
        
        assert.equal(token.propertyValueToken.text, 5);
    });

    test("calibrate_queryWithCommand_scanUntilReturnExpectedCommand", () => {

        let queryAsString = 'GET /lorem/command';
        let offset = queryAsString.length;
        let scanner = new ElasticsearchQueryDocumentScanner(queryAsString, offset);
        scanner.calibrate();

        let token = scanner.scanUntil(ScannerState.AfterCommand);
        
        assert.equal(token.text, '/lorem/command');
    });

    test("calibrate_queryWithBeginningOfCommand_scanUntilReturnExpectedMethod", () => {

        let queryAsString = 'GET lore';
        let offset = queryAsString.length;
        let scanner = new ElasticsearchQueryDocumentScanner(queryAsString, offset);
        scanner.calibrate();

        let token = scanner.scanUntil(ScannerState.AfterMethod);
        
        assert.equal(token.text, 'GET');
    });

    test("calibrate_queryWithBeginningOfInput_scanUntilReturnExpectedCommand", () => {

        //what should happen here? is this the end of the query or can we expect more..

        let queryAsString = 'GET /lorem/command(lo';
        let offset = queryAsString.length;
        let scanner = new ElasticsearchQueryDocumentScanner(queryAsString, offset);
        scanner.calibrate();

        let token = scanner.scanUntil(ScannerState.AfterCommand);
        
        assert.equal(token.text, '/lorem/command');
    });

    test("calibrate_queryWithBeginningOfBody_scanUntilReturnExpectedCommand", () => {

        let queryAsString = 'GET /lorem/command \n{ ';
        let offset = queryAsString.length;
        let scanner = new ElasticsearchQueryDocumentScanner(queryAsString, offset);
        scanner.calibrate();

        let token = scanner.scanUntil(ScannerState.AfterCommand);
        
        assert.equal(token.text, '/lorem/command');
    });

    test("calibrate_queryWithInput_scanUntilReturnExpectedCommand", () => {

        let queryAsString = 'GET /lorem/command(lorem="5")';
        let offset = queryAsString.length;
        let scanner = new ElasticsearchQueryDocumentScanner(queryAsString, offset);
        scanner.calibrate();

        let token = scanner.scanUntil(ScannerState.AfterCommand);
        
        assert.equal(token.text, '/lorem/command');
    });

    test("calibrate_queryWithInputAndBeginningOnQuery_hasExectedStateAndscanUntilReturnNothing", () => {

        let queryAsString = 'GET /lorem/command(lorem="5") GE';
        let offset = queryAsString.length;
        let scanner = new ElasticsearchQueryDocumentScanner(queryAsString, offset);
        scanner.calibrate();

        let token = scanner.scanUntil(ScannerState.AfterCommand);

        assert.equal(token, null);
    });

    test("calibrate_queryWithBody_hasExectedStateAndscanUntilReturnNothing", () => {

        let queryAsString = 'GET /lorem/command {\n}';
        let offset = queryAsString.length;
        let scanner = new ElasticsearchQueryDocumentScanner(queryAsString, offset);
        scanner.calibrate();

        let token = scanner.scanUntil(ScannerState.AfterCommand);
        
        assert.equal(token, null);
    });
   
});