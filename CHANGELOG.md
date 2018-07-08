# Change Log
All notable changes to the "elasticdeveloper" extension will be documented in this file.

## [Future]
- Treeview of existing indices, aliases, templates etc from target environment
- Better Autocomplete support, include existing indicies, aliases, etc from target environment
- Rebuild syntax highlight
    - Color highlight for mustache syntax
    - Color highlight for query-string syntax

## [1.0.12] - 2018-07-07
### Fixed
- Changed display name to Elasticsearch Developer tool

## [1.0.11] - 2018-07-03
### Fixed
- Added code lens title for bulk

## [1.0.10] - 2018-07-01
### Fixed
- I guess it's time to remove the preview. :)
- Added support for Bulk API, Multi Search API
- Upgrade vscode
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