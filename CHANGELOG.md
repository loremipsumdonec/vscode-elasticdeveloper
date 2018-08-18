# Change Log
All notable changes to the "Elasticsearch Developer tool" extension will be documented in this file.

## [Future]
- Better Intellisense should also include existing indicies, aliases, etc from target environment
- Create a language server
- Rebuild syntax highlight
    - Color highlight for mustache syntax
    - Color highlight for query-string syntax

## [1.2.8] - 2018-08-17
### Fixed
-  Better support for intellisense and quotes

## [1.2.7] - 2018-08-17
### Fixed
-  Intellisense for the query body will only trigger on empty line.

## [1.2.6] - 2018-08-15
### Fixed
-  Updated multiple indices endpoints

## [1.2.5] - 2018-08-14
### Fixed
- And now the autocomplete in arrays should be back. :)
    - (hope I have not forgotten to change any more places)

## [1.2.4] - 2018-08-14
### Fixed
- Autocomplete not showing after a multi-field.
    
## [1.2.3] - 2018-08-10
### Fixed
- Problem with query dsl
    - bool query: must, must_not, should and filter not showing query dsl when array.
    - function_score: problem with functions, boost_mode etc.

## [1.2.2] - 2018-08-09
### Fixed
- Removed quotes from querystring
- Updated query-dsl with span queries

## [1.2.1] - 2018-08-08
### Added
- Better array support in the endpoint graphs
### Fixed
- Fixed query-dsl endpoint

## [1.2.0] - 2018-08-07
### Added
- Open REST API endpoint documentation
- Autocomplete support
### Fixed
- Better autocomplete support for REST API
    - Has support for query strings

## [1.1.0] - 2018-07-09
### Added
- Added the Explorer view
- Compare deployed index templates with files in the workspace
- Create file from deployed index template

## [1.0.13] - 2018-07-08
### Fixed
- Search templates using Mustache syntax. 
    - bug was created when implemented support for Bulk API

## [1.0.12] - 2018-07-07
### Changed
- Changed display name to Elasticsearch Developer tool

## [1.0.11] - 2018-07-03
### Added
- Added code lens title for bulk query

## [1.0.10] - 2018-07-01
### Added
- Added support for Bulk API, Multi Search API
- Upgrade vscode
### Changed
- I guess it's time to remove the preview. :)
### Fixed
- Fixed problem with keybindings

## [1.0.8-preview] - 2018-04-12
### Fixed
- When working with search templates the "source" property in a search template body will be stringify so it supports Mustache syntax.

## [1.0.7-preview] - 2018-04-09
### Fixed
- Removed logger from indexTemplateDocument.parse

## [1.0.6-preview] - 2018-04-09
### Fixed
- Index template mappings did not support objects in array, example dynamic_mappings. 
- Wrong name on Index template property index_pattern, changed to index_patterns.

## [1.0.5-preview] - 2018-04-06
### Fixed
- Fixed problem with configuration object in a esquery must begin on the first line.

## [1.0.1-preview] - 2018-04-06
### Fixed
- Fixed problem with HTML transformations not working on Mac OS X.

## [1.0.0-preview] - 2018-04-06
### Added
- Support for mutiple environments
- Ping an environment via code lens and explorer menu
- Change target environment via code lens command, explorer menu and key bindings
- Deploy an index template to the target environment via code lens and explorer menu
- Retract index template from the target environment via code lens and explorer menu
- Basic Autocomplete support for Elasticsearch HTTP API
- Run a single query via code lens and explorer menu
- Run multiple queries via explorer menu
- Configuration object for queries 
    - Makes it possible to send same input to multiple queries and control output format
- Save output as JSON file
- Save and transform response to HTML, done with handlebars http://handlebarsjs.com/
- Save same response as both JSON and HTML