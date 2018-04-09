import * as assert from 'assert';
import { IndexTemplateDocument } from '../parsers/indexTemplateDocument';

suite("IndexTemplateDocument.test", () => {

    test("parse_textContainingOneIndexTemplate_returnDocumentWithOneIndexTemplate", () => {

        let indexTemplateAsString = '{ "index_patterns": ["bestBet*", "lorem", "ipsum*"], "settings": { "number_of_shards": 5 }}';

        let document = IndexTemplateDocument.parse(indexTemplateAsString);
        assert.equal(document.indexTemplates.length, 1);

        let indexTemplate = document.indexTemplates.pop();
        assert.equal(indexTemplate.index_patterns.length, 3);
        assert.equal(indexTemplate.settings.number_of_shards, 5);
    });

    test("parse_indexTemplateWithDynamicTemplates_indexTemplateHasDynamicMappings", () => {

        let indexTemplateAsString = '{ "mappings": { "_doc": { "dynamic_templates": [ { "content": "hello"} ] } } }';

        let document = IndexTemplateDocument.parse(indexTemplateAsString);
        assert.equal(document.indexTemplates.length, 1);

        let indexTemplate = document.indexTemplates.pop();
        assert.equal(indexTemplate.mappings._doc.dynamic_templates.length, 1);
        assert.equal(indexTemplate.mappings._doc.dynamic_templates[0].content, 'hello');
    });
});