const libCLIProgram = require('pict-service-commandlineutility');

let _Pict = new libCLIProgram(
	{
		Product: 'Quackage',
		Version: require('../package.json').version,

		Command: 'quackage',
		Description: 'Extensions for managing package.json and make build processes consistent.',

		DefaultProgramConfiguration: require('./Default-Quackage-Configuration.json'),

		// TODO: Should this use a shared config?
		ProgramConfigurationFileName: '.quackage.json',
		AutoGatherProgramConfiguration: true,
		AutoAddConfigurationExplanationCommand: true
	},
	[
		// Management for package.json
		require('./commands/Quackage-Command-UpdatePackage.js'),
		require('./commands/Quackage-Command-UpdatePackage-Luxury.js'),
		require('./commands/Quackage-Command-Lint.js'),
		require('./commands/Quackage-Command-CheckDependencies.js'),
		require('./commands/Quackage-Command-UpdateNodeGitignore.js'),

		// Mocha test execution
		require('./commands/Quackage-Command-RunMochaTests.js'),
		require('./commands/Quackage-Command-RunNycCoverage.js'),

		// Gulp build execution (for multiple build targets)
		require('./commands/Quackage-Command-Build.js'),
		require('./commands/Quackage-Command-CopyFilesFromTo.js'),

		// Generate documentation from a folder of code
		require('./commands/Quackage-Command-GenerateDocumentation.js'),

		// Template handling
		require('./commands/Quackage-Command-AssembleJSONViews.js'),

		// Boilerplate file management
		require('./commands/Quackage-Command-Boilerplate.js'),
		require('./commands/Quackage-Command-ListTemplates.js'),
		require('./commands/Quackage-Command-BuildTemplates.js'),

		// npm + GHCR release pipeline (postversion / postpublish hooks
		// + one-shot release shortcuts). See Quackage-Command-Release.js
		// for the BUILD_DOCKER opt-in convention.
		require('./commands/Quackage-Command-Release.js'),
		require('./commands/Quackage-Command-DockerInit.js'),

		// Stricture
		require('./commands/stricture//Quackage-Command-Stricture-Compile.js'),
		require('./commands/stricture/Quackage-Command-StrictureLegacy.js'),

		// Documentation preparation (indoctrinate + pict-docuserve)
		require('./commands/Quackage-Command-Indoctrinate.js'),
		require('./commands/Quackage-Command-IndoctrinateIndex.js'),
		require('./commands/Quackage-Command-DocuserveInject.js'),
		require('./commands/Quackage-Command-DocuservePrepareLocal.js'),
		require('./commands/Quackage-Command-PrepareDocs.js'),
		require('./commands/Quackage-Command-DocuserveServe.js'),

		// HTML example application building and serving
		require('./commands/html_example_serving/Quackage-Command-ExamplesBuild.js'),
		require('./commands/html_example_serving/Quackage-Command-ExamplesServe.js'),
		require('./commands/html_example_serving/Quackage-Command-Examples.js')
	]);

// Instantiate the file persistence service
_Pict.instantiateServiceProvider('FilePersistence');
_Pict.instantiateServiceProvider('DataGeneration');
// Add the Quackage Process Management service
_Pict.addAndInstantiateServiceType('QuackageProcess', require('./services/Quackage-Execute-Process.js'));
// Add the Quackage Example Service for building and serving HTML examples
_Pict.addAndInstantiateServiceType('QuackageExampleService', require('./services/Quackage-ExampleService.js'));

// Grab the current working directory for the quackage
_Pict.AppData.CWD = _Pict.QuackageProcess.cwd();
_Pict.AppData.QuackageFolder = _Pict.QuackageProcess.quackageFolder();

// Check that a package.json is in the folder we are quacking from
try
{
	_Pict.AppData.Package = require(`${_Pict.AppData.CWD}/package.json`);
}
catch (pError)
{
	_Pict.log.error(`No package.json found in [${_Pict.AppData.CWD}].  Please run quackage from a folder with a package.json file for maximum awesome.`);
	_Pict.log.info(`Loading a default package.json...`);
	_Pict.AppData.Package = require('./Default-NpmPackage.json');
}
finally
{
}

module.exports = _Pict;