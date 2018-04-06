# Change Log
All notable changes to the "elasticdeveloper" extension will be documented in this file.

## Known Issue
- The configuration object in a esquery must begin on the first line.

## [Unreleased]
- Better Autocomplete support, include existing indicies, aliases, etc from target environment

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