import * as assert from 'assert';
import { IndexTemplateDocument } from '../parsers/indexTemplateDocument';

suite("IndexTemplateDocument.test", () => {

    test("parse_textContainingOneIndexTemplate_returnDocumentWithOneIndexTemplate", () => {

        let indexTemplateAsString = '{ "index_pattern": ["bestBet*", "lorem", "ipsum*"], "settings": { "number_of_shards": 5 }}';

        let document = IndexTemplateDocument.parse(indexTemplateAsString);
        assert.equal(document.indexTemplates.length, 1);

        let indexTemplate = document.indexTemplates.pop();
        assert.equal(indexTemplate.index_pattern.length, 3);
        assert.equal(indexTemplate.settings.number_of_shards, 5);
    });
});