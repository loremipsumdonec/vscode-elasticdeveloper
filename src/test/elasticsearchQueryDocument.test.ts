import * as assert from 'assert';
import { ElasticsearchQueryDocument } from '../parsers/elasticsearchQueryDocument';

suite("ElasticsearchQueryDocument", () => {

    test("parse_textContainingTwoQueriesWithNoInputOrBody_returnDocumentWithTwoQueries", () => {

        let firstQuery = 'GET /lorem/command';
        let secondeQuery = 'GET /ipsum/donec';
        let query = firstQuery + '\r\n' + secondeQuery;

        let document = ElasticsearchQueryDocument.parse(query);
        assert.equal(document.queries.length, 2);
    });

    test("parse_textContainingTwoQueriesOneWithAndEmptyInput_returnDocumentWithTwoQueries", () => {

        let firstQuery = 'GET /lorem/command()';
        let secondeQuery = 'GET /ipsum/donec';
        let query = firstQuery + '\r\n' + secondeQuery;

        let document = ElasticsearchQueryDocument.parse(query);
        assert.equal(document.queries.length, 2);
    });

    test("parse_textContainingTwoQueriesOneWithInput_returnDocumentWithTwoQueries", () => {

        let firstQuery = 'GET /lorem/command(lorem=5)';
        let secondeQuery = 'GET /ipsum/donec';
        let query = firstQuery + '\r\n' + secondeQuery;

        let document = ElasticsearchQueryDocument.parse(query);
        assert.equal(document.queries.length, 2);
    });

    test("parse_textContainingConfiguration_returnDocumentWithOneConfiguration", () => {

        let firstQuery = '{ "params": { "query": "hello world" }}';
        let query = firstQuery;

        let document = ElasticsearchQueryDocument.parse(query);
        assert.equal(document.configurations.length, 1);
        assert.equal(document.configurations[0].params.query, 'hello world');
    });

    test("parse_textContainingConfigurationNotOnFirstChar_returnDocumentWithOneConfiguration", () => {

        let firstQuery = ' { "params": { "query": "hello world" }}';
        let query = firstQuery;

        let document = ElasticsearchQueryDocument.parse(query);
        assert.equal(document.configurations.length, 1);
        assert.equal(document.configurations[0].params.query, 'hello world');
    });

    test("parse_textContainingConfigurationAndQuery_returnDocumentWithOneConfigurationAndOneQuery", () => {

        let firstQuery = '{ "params": { "query": "hello world" }}';
        let secondeQuery = 'GET /lorem/command(lorem=5)';
        let query = firstQuery + '\r\n' + secondeQuery;

        let document = ElasticsearchQueryDocument.parse(query);
        assert.equal(document.configurations.length, 1);
        assert.equal(document.queries.length, 1);
    });

});