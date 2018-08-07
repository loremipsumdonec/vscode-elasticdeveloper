'use strict';

export const Name = 'elasticdeveloper';
export const Publisher = 'crasnam';
export const ExtensionId = Publisher + '.' + Name;
export const WorkspaceStateEnvironmentPath = 'environment.path';
export const CommandPrefix = Name;
export const DefaultVersion = '6.3';

/**
 *  ElasticsearchQuery
 */
export const ElasticsearchQueryLanguageId = 'esquery';
export const ElasticsearchQueryDocumentSelector = ElasticsearchQueryLanguageId;
export const ElasticsearchQueryCodeLensCommandRunQuery = 'query.run.fromCodeLens';
export const ElasticsearchQueryCodeLensCommandRunAllQueries = 'query.runAll.fromCodeLens';
export const ElasticsearchQueryTextEditorCommandRunAllQueries = 'query.runAll.fromTextEditor';
export const ElasticsearchQueryCommandRunAllQueries = 'query.runAll';

/**
 * IndexTemplate
 */
export const IndexTemplateLanguageId = 'esind';
export const IndexTemplateDocumentSelector = IndexTemplateLanguageId;
export const IndexTemplateCodeLensCommandDeploy = 'indexTemplate.deploy.fromCodeLens';
export const IndexTemplateCommandDeploy = 'indexTemplate.deploy';
export const IndexTemplateCodeLensCommandRetract = 'indexTemplate.retract.fromCodeLens';
export const IndexTemplateExplorerCommandRetract = 'indexTemplate.retract.fromExplorer';
export const IndexTemplateCommandRetract = 'indexTemplate.retract';
export const IndexTemplateExplorerCommandCompare = 'indexTemplate.compare.fromExplorer';
export const IndexTemplateExplorerCommandCreateFile = 'indexTemplate.createFile.fromExplorer'

/**
 * Script
 */
export const ScriptLanguageId = 'esscr';
export const ScriptDocumentSelector = ScriptLanguageId;
export const ScriptCodeLensCommandDeploy = 'script.deploy.fromCodeLens';
export const ScriptCommandDeploy = 'script.deploy';
export const ScriptCodeLensCommandRetract = 'script.retract.fromCodeLens';
export const ScriptExplorerCommandRetract = 'script.retract.fromExplorer';
export const ScriptCommandRetract = 'script.retract';
export const ScriptExplorerCommandCompare = 'script.compare.fromExplorer';
export const ScriptExplorerCommandCreateFile = 'script.createFile.fromExplorer'

/**
 * Index
 */
export const IndexExplorerCommandDelete = 'index.delete.fromExplorer';

/**
 * Environment
 */
export const EnvironmentLanguageId = 'esenv';
export const EnvironmentDocumentSelector = EnvironmentLanguageId;
export const EnvironmentCodeLensCommandPing = 'environment.ping.fromCodeLens';
export const EnvironmentExplorerCommandPing = 'environment.ping.fromExplorer';
export const EnvironmentCommandPing = 'environment.ping';
export const EnvironmentCodeLensCommandSetAsTarget = 'environment.setAsTarget.fromCodeLens';
export const EnvironmentExplorerCommandSetAsTarget = 'environment.setAsTarget.fromExplorer';
export const EnvironmentCommandSetAsTarget = 'environment.setAsTarget';
export const EnvironmentExplorerCommandOpenFile = 'environment.openFile.fromExplorer';

/**
 * ExplorerCommandRefreshNode
 */
 export const ExplorerCommandRefreshNode = 'explorer.refreshNode.fromExplorer';

 /**
  * IntelliSense
  */
 export const IntelliSenseCommandStreamGraph = 'intelliSense.streamGraph';
 export const IntelliSenseCodeLensCommandOpenEndpointDocumentation = 'intelliSense.openEndpointDocumentation.fromCodeLens';
 export const IntelliSenseConfigurationCodeLensCommandOpenEndpointDocumentationEnabled = Name + '.intelliSense.openEndpointDocumentation.enabled';
 export const IntelliSenseConfigurationEnabled = Name + '.intelliSense.enabled';

 /**
  * Endpoint
  */
