import * as assert from 'assert';
import { EnvironmentDocument } from '../parsers/environmentDocument';

suite("EnvironmentDocument.test", () => {

    test("parse_textContainingOneEnvironmentWithHostAndName_returnDocumentWithOneEnvironment", () => {

        let firstEnvironment = '{ "host": "http://localhost:9200", "name": "lorem ipdum" }';

        let document = EnvironmentDocument.parse(firstEnvironment);
        assert.equal(document.environments.length, 1);

        let environment = document.environments.pop();
        assert.equal(environment.host, "http://localhost:9200");
        assert.equal(environment.name, "lorem ipdum");

    });
});