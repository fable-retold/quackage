/**
* Unit tests for Quackage
*
* @author      Steven Velozo <steven@velozo.com>
*/

var libQuackage = require('../source/Quackage-CLIProgram.js');

var libChildProcess = require('child_process');
var libFS = require('fs');
var libOS = require('os');
var libPath = require('path');

var Chai = require("chai");
var Expect = Chai.expect;

// A tiny script that exits with whatever code (or signal) it is asked to
var EXIT_FIXTURE = libPath.join(__dirname, 'fixtures', 'Quackage-Exit-With-Code.js');
// The quack command line entry point, as npm runs it for `npx quack`
var QUACK_RUN = libPath.join(__dirname, '..', 'source', 'Quackage-Run.js');
// The mocha executable script, so a scratch module can run `quack test` without an npm install
var MOCHA_BIN = libPath.join(libPath.dirname(require.resolve('mocha/package.json')), 'bin', 'mocha.js');

// Make a scratch module (package.json + one mocha test file) in the OS temp folder
var createScratchModule = function(pName, pTestSource)
{
	let tmpModuleFolder = libFS.mkdtempSync(libPath.join(libOS.tmpdir(), `quackage-${pName}-`));
	libFS.mkdirSync(libPath.join(tmpModuleFolder, 'test'));
	libFS.mkdirSync(libPath.join(tmpModuleFolder, 'node_modules', '.bin'), { recursive: true });
	libFS.writeFileSync(libPath.join(tmpModuleFolder, 'package.json'), JSON.stringify({ name: pName, version: '0.0.0' }));
	libFS.writeFileSync(libPath.join(tmpModuleFolder, 'test', `${pName}_tests.js`), pTestSource);
	libFS.symlinkSync(MOCHA_BIN, libPath.join(tmpModuleFolder, 'node_modules', '.bin', 'mocha'));
	return tmpModuleFolder;
};

// Run `quack <pArguments>` as its own process and report its exit code and output
var runQuack = function(pArguments, pCWD, fCallback)
{
	let tmpOutput = '';
	let tmpQuack = libChildProcess.spawn(process.execPath, [QUACK_RUN].concat(pArguments), { cwd: pCWD });
	tmpQuack.stdout.on('data', (pData) => { tmpOutput += pData.toString(); });
	tmpQuack.stderr.on('data', (pData) => { tmpOutput += pData.toString(); });
	tmpQuack.on('close', (pCode, pSignal) => { return fCallback(pCode, pSignal, tmpOutput); });
};

// Helper to get the list of registered commander command names
var getCommandNames = function()
{
	return libQuackage.CommandLineUtility._Command.commands.map((pCmd) => pCmd.name());
};

// Helper to get a registered commander command by name
var getCommand = function(pName)
{
	return libQuackage.CommandLineUtility._Command.commands.find((pCmd) => pCmd.name() === pName);
};

suite
(
	'Quackage',
	function()
	{
		setup ( () => {} );

		suite
		(
			'Execution Sanity',
			function()
			{
				test
				(
					'Quackage should load up okay.',
					function()
					{
						// How doth the little crocodile automatically test the cli-only utility well?
						let testQuackage = libQuackage;
						Expect(testQuackage.settings.Product).to.equal('Quackage')
					}
				);
			}
		);

		suite
		(
			'All Commands Registration',
			function()
			{
				test
				(
					'All expected commands should be registered in the CLI.',
					function()
					{
						let tmpCommandNames = getCommandNames();

						// explain-config is auto-added by AutoAddConfigurationExplanationCommand
						Expect(tmpCommandNames).to.include('explain-config');

						// Package management
						Expect(tmpCommandNames).to.include('updatepackage');
						Expect(tmpCommandNames).to.include('luxuryupdatepackage');
						Expect(tmpCommandNames).to.include('lint');

						// Testing
						Expect(tmpCommandNames).to.include('run-mocha-tests');

						// Building
						Expect(tmpCommandNames).to.include('build');
						Expect(tmpCommandNames).to.include('copy-files-from-to');

						// Documentation generation
						Expect(tmpCommandNames).to.include('generate-documentation');

						// Templates
						Expect(tmpCommandNames).to.include('assemble_json_views');
						Expect(tmpCommandNames).to.include('boilerplate');
						Expect(tmpCommandNames).to.include('listtemplates');
						Expect(tmpCommandNames).to.include('buildtemplates');

						// Stricture
						Expect(tmpCommandNames).to.include('stricture-compile');
						Expect(tmpCommandNames).to.include('stricture-legaacy');

						// Docuserve / Indoctrinate
						Expect(tmpCommandNames).to.include('indoctrinate');
						Expect(tmpCommandNames).to.include('indoctrinate-index');
						Expect(tmpCommandNames).to.include('docuserve-inject');
						Expect(tmpCommandNames).to.include('prepare-local');
						Expect(tmpCommandNames).to.include('prepare-docs');
						Expect(tmpCommandNames).to.include('docs-serve');

						// HTML example serving
						Expect(tmpCommandNames).to.include('examples-build');
						Expect(tmpCommandNames).to.include('examples-serve');
						Expect(tmpCommandNames).to.include('examples');
					}
				);

				test
				(
					'Commands should have correct aliases.',
					function()
					{
						Expect(getCommand('updatepackage').aliases()).to.include('update_package');

						Expect(getCommand('luxuryupdatepackage').aliases()).to.include('luxury_update_package');
						Expect(getCommand('luxuryupdatepackage').aliases()).to.include('lux');

						Expect(getCommand('run-mocha-tests').aliases()).to.include('test');

						Expect(getCommand('copy-files-from-to').aliases()).to.include('copy');
						Expect(getCommand('copy-files-from-to').aliases()).to.include('cp');

						Expect(getCommand('generate-documentation').aliases()).to.include('dgen');

						Expect(getCommand('assemble_json_views').aliases()).to.include('ajv');

						Expect(getCommand('boilerplate').aliases()).to.include('boil');
						Expect(getCommand('boilerplate').aliases()).to.include('bp');

						Expect(getCommand('listtemplates').aliases()).to.include('list');
						Expect(getCommand('listtemplates').aliases()).to.include('ls');
						Expect(getCommand('listtemplates').aliases()).to.include('lt');

						Expect(getCommand('buildtemplates').aliases()).to.include('bt');

						Expect(getCommand('stricture-compile').aliases()).to.include('scomp');
						Expect(getCommand('stricture-legaacy').aliases()).to.include('str');

						Expect(getCommand('indoctrinate').aliases()).to.include('indoc');

						Expect(getCommand('indoctrinate-index').aliases()).to.include('indoc-index');
						Expect(getCommand('indoctrinate-index').aliases()).to.include('keyword-index');

						Expect(getCommand('docuserve-inject').aliases()).to.include('docuserve');
						Expect(getCommand('docuserve-inject').aliases()).to.include('inject-docs');

						Expect(getCommand('prepare-local').aliases()).to.include('local-docs');
						Expect(getCommand('prepare-local').aliases()).to.include('stage-local');

						Expect(getCommand('prepare-docs').aliases()).to.include('docs');
						Expect(getCommand('prepare-docs').aliases()).to.include('prep-docs');

						Expect(getCommand('docs-serve').aliases()).to.include('serve-docs');
					}
				);
			}
		);

		suite
		(
			'Package Management Commands',
			function()
			{
				test
				(
					'UpdatePackage command class should require and have onRunAsync.',
					function()
					{
						let tmpClass = require('../source/commands/Quackage-Command-UpdatePackage.js');
						Expect(tmpClass).to.be.a('function');
						Expect(tmpClass.prototype.onRunAsync).to.be.a('function');
					}
				);

				test
				(
					'UpdatePackage-Luxury command class should require and have onRunAsync.',
					function()
					{
						let tmpClass = require('../source/commands/Quackage-Command-UpdatePackage-Luxury.js');
						Expect(tmpClass).to.be.a('function');
						Expect(tmpClass.prototype.onRunAsync).to.be.a('function');
					}
				);

				test
				(
					'Lint command class should require and have onRunAsync.',
					function()
					{
						let tmpClass = require('../source/commands/Quackage-Command-Lint.js');
						Expect(tmpClass).to.be.a('function');
						Expect(tmpClass.prototype.onRunAsync).to.be.a('function');
					}
				);
			}
		);

		suite
		(
			'Test Execution Commands',
			function()
			{
				test
				(
					'RunMochaTests command class should require and have onRunAsync.',
					function()
					{
						let tmpClass = require('../source/commands/Quackage-Command-RunMochaTests.js');
						Expect(tmpClass).to.be.a('function');
						Expect(tmpClass.prototype.onRunAsync).to.be.a('function');
					}
				);

				test
				(
					'RunMochaTests command should have a --grep option registered.',
					function()
					{
						let tmpCommand = getCommand('run-mocha-tests');
						Expect(tmpCommand).to.be.an('object');

						// Verify the --grep option is registered on the commander command
						let tmpGrepOption = tmpCommand.options.find((pOpt) => pOpt.long === '--grep');
						Expect(tmpGrepOption).to.be.an('object', 'Expected --grep option to be registered on run-mocha-tests command');
						Expect(tmpGrepOption.short).to.equal('-g');
						Expect(tmpGrepOption.optional).to.equal(true, 'grep should accept an optional value');
					}
				);

				test
				(
					'RunMochaTests --grep option property name should match what onRunAsync reads.',
					function()
					{
						let tmpCommand = getCommand('run-mocha-tests');
						let tmpGrepOption = tmpCommand.options.find((pOpt) => pOpt.long === '--grep');

						// Commander derives the property name from the long flag (--grep => "grep").
						// onRunAsync reads this.CommandOptions.grep to get the expression.
						// This test ensures the two stay in sync — the bug was that onRunAsync
						// previously read "search_expression" (the placeholder name) instead of "grep".
						Expect(tmpGrepOption.attributeName()).to.equal('grep');
					}
				);
			}
		);

		suite
		(
			'Build Commands',
			function()
			{
				test
				(
					'Build command class should require and have onRunAsync.',
					function()
					{
						let tmpClass = require('../source/commands/Quackage-Command-Build.js');
						Expect(tmpClass).to.be.a('function');
						Expect(tmpClass.prototype.onRunAsync).to.be.a('function');
					}
				);

				test
				(
					'CopyFilesFromTo command class should require and have onRunAsync.',
					function()
					{
						let tmpClass = require('../source/commands/Quackage-Command-CopyFilesFromTo.js');
						Expect(tmpClass).to.be.a('function');
						Expect(tmpClass.prototype.onRunAsync).to.be.a('function');
					}
				);
			}
		);

		suite
		(
			'Documentation Generation Commands',
			function()
			{
				test
				(
					'GenerateDocumentation command class should require and have expected methods.',
					function()
					{
						let tmpClass = require('../source/commands/Quackage-Command-GenerateDocumentation.js');
						Expect(tmpClass).to.be.a('function');
						Expect(tmpClass.prototype.onRunAsync).to.be.a('function');
						Expect(tmpClass.prototype.runJSDocCLI).to.be.a('function');
					}
				);
			}
		);

		suite
		(
			'Template Commands',
			function()
			{
				test
				(
					'AssembleJSONViews command class should require and have expected methods.',
					function()
					{
						let tmpClass = require('../source/commands/Quackage-Command-AssembleJSONViews.js');
						Expect(tmpClass).to.be.a('function');
						Expect(tmpClass.prototype.onRunAsync).to.be.a('function');
						Expect(tmpClass.prototype.generateView).to.be.a('function');
						Expect(tmpClass.prototype.addView).to.be.a('function');
						Expect(tmpClass.prototype.generateViewsRecursively).to.be.a('function');
						Expect(tmpClass.prototype.generateViewsFromFolder).to.be.a('function');
					}
				);

				test
				(
					'Boilerplate command class should require and have onRunAsync.',
					function()
					{
						let tmpClass = require('../source/commands/Quackage-Command-Boilerplate.js');
						Expect(tmpClass).to.be.a('function');
						Expect(tmpClass.prototype.onRunAsync).to.be.a('function');
					}
				);

				test
				(
					'ListTemplates command class should require and have onRunAsync.',
					function()
					{
						let tmpClass = require('../source/commands/Quackage-Command-ListTemplates.js');
						Expect(tmpClass).to.be.a('function');
						Expect(tmpClass.prototype.onRunAsync).to.be.a('function');
					}
				);

				test
				(
					'BuildTemplates command class should require and have expected methods.',
					function()
					{
						let tmpClass = require('../source/commands/Quackage-Command-BuildTemplates.js');
						Expect(tmpClass).to.be.a('function');
						Expect(tmpClass.prototype.onRunAsync).to.be.a('function');
						Expect(tmpClass.prototype.getTemplateSet).to.be.a('function');
						Expect(tmpClass.prototype.addTemplateToSet).to.be.a('function');
						Expect(tmpClass.prototype.generateTemplatesRecursively).to.be.a('function');
						Expect(tmpClass.prototype.generateTemplatesFromFolder).to.be.a('function');
					}
				);
			}
		);

		suite
		(
			'Stricture Commands',
			function()
			{
				test
				(
					'StrictureCompile command class should require and have onRunAsync.',
					function()
					{
						let tmpClass = require('../source/commands/stricture/Quackage-Command-Stricture-Compile.js');
						Expect(tmpClass).to.be.a('function');
						Expect(tmpClass.prototype.onRunAsync).to.be.a('function');
					}
				);

				test
				(
					'StrictureLegacy command class should require and have onRunAsync.',
					function()
					{
						let tmpClass = require('../source/commands/stricture/Quackage-Command-StrictureLegacy.js');
						Expect(tmpClass).to.be.a('function');
						Expect(tmpClass.prototype.onRunAsync).to.be.a('function');
					}
				);
			}
		);

		suite
		(
			'Docuserve and Indoctrinate Commands',
			function()
			{
				test
				(
					'Indoctrinate command class should require and have expected methods.',
					function()
					{
						let tmpClass = require('../source/commands/Quackage-Command-Indoctrinate.js');
						Expect(tmpClass).to.be.a('function');
						Expect(tmpClass.prototype.onRunAsync).to.be.a('function');
						Expect(tmpClass.prototype.resolveExecutable).to.be.a('function');
					}
				);

				test
				(
					'IndoctrinateIndex command class should require and have expected methods.',
					function()
					{
						let tmpClass = require('../source/commands/Quackage-Command-IndoctrinateIndex.js');
						Expect(tmpClass).to.be.a('function');
						Expect(tmpClass.prototype.onRunAsync).to.be.a('function');
						Expect(tmpClass.prototype.resolveExecutable).to.be.a('function');
					}
				);

				test
				(
					'DocuserveInject command class should require and have expected methods.',
					function()
					{
						let tmpClass = require('../source/commands/Quackage-Command-DocuserveInject.js');
						Expect(tmpClass).to.be.a('function');
						Expect(tmpClass.prototype.onRunAsync).to.be.a('function');
						Expect(tmpClass.prototype.resolveExecutable).to.be.a('function');
					}
				);

				test
				(
					'DocuservePrepareLocal command class should require and have expected methods.',
					function()
					{
						let tmpClass = require('../source/commands/Quackage-Command-DocuservePrepareLocal.js');
						Expect(tmpClass).to.be.a('function');
						Expect(tmpClass.prototype.onRunAsync).to.be.a('function');
						Expect(tmpClass.prototype.resolveExecutable).to.be.a('function');
					}
				);

				test
				(
					'PrepareDocs command class should require and have expected methods.',
					function()
					{
						let tmpClass = require('../source/commands/Quackage-Command-PrepareDocs.js');
						Expect(tmpClass).to.be.a('function');
						Expect(tmpClass.prototype.onRunAsync).to.be.a('function');
						Expect(tmpClass.prototype.resolveExecutable).to.be.a('function');
					}
				);

				test
				(
					'DocuserveServe command class should require and have expected methods.',
					function()
					{
						let tmpClass = require('../source/commands/Quackage-Command-DocuserveServe.js');
						Expect(tmpClass).to.be.a('function');
						Expect(tmpClass.prototype.onRunAsync).to.be.a('function');
						Expect(tmpClass.prototype.resolveExecutable).to.be.a('function');
					}
				);
			}
		);

		suite
		(
			'HTML Example Serving Commands',
			function()
			{
				test
				(
					'ExamplesBuild command class should require and have onRunAsync.',
					function()
					{
						let tmpExamplesBuild = require('../source/commands/html_example_serving/Quackage-Command-ExamplesBuild.js');
						Expect(tmpExamplesBuild).to.be.a('function');
						Expect(tmpExamplesBuild.prototype.onRunAsync).to.be.a('function');
					}
				);

				test
				(
					'ExamplesServe command class should require and have onRunAsync.',
					function()
					{
						let tmpExamplesServe = require('../source/commands/html_example_serving/Quackage-Command-ExamplesServe.js');
						Expect(tmpExamplesServe).to.be.a('function');
						Expect(tmpExamplesServe.prototype.onRunAsync).to.be.a('function');
					}
				);

				test
				(
					'Examples combined command class should require and have onRunAsync.',
					function()
					{
						let tmpExamples = require('../source/commands/html_example_serving/Quackage-Command-Examples.js');
						Expect(tmpExamples).to.be.a('function');
						Expect(tmpExamples.prototype.onRunAsync).to.be.a('function');
					}
				);
			}
		);

		suite
		(
			'QuackageExampleService',
			function()
			{
				test
				(
					'QuackageExampleService should be instantiated on the pict instance.',
					function()
					{
						Expect(libQuackage.QuackageExampleService).to.be.an('object');
						Expect(libQuackage.QuackageExampleService.serviceType).to.equal('QuackageExampleService');
					}
				);

				test
				(
					'QuackageExampleService should have expected methods.',
					function()
					{
						let tmpService = libQuackage.QuackageExampleService;
						Expect(tmpService.gatherExampleFolders).to.be.a('function');
						Expect(tmpService.gatherServableExamples).to.be.a('function');
						Expect(tmpService.formatDisplayName).to.be.a('function');
						Expect(tmpService.hashProjectNameToPort).to.be.a('function');
						Expect(tmpService.getMimeType).to.be.a('function');
						Expect(tmpService.generateIndexHTML).to.be.a('function');
						Expect(tmpService.resolveExecutable).to.be.a('function');
						Expect(tmpService.buildExamples).to.be.a('function');
						Expect(tmpService.serveExamples).to.be.a('function');
					}
				);

				test
				(
					'gatherExampleFolders should return empty array for nonexistent path.',
					function()
					{
						let tmpResult = libQuackage.QuackageExampleService.gatherExampleFolders('/nonexistent/path/that/does/not/exist');
						Expect(tmpResult).to.be.an('array');
						Expect(tmpResult).to.have.length(0);
					}
				);

				test
				(
					'gatherServableExamples should return empty array for nonexistent path.',
					function()
					{
						let tmpResult = libQuackage.QuackageExampleService.gatherServableExamples('/nonexistent/path/that/does/not/exist');
						Expect(tmpResult).to.be.an('array');
						Expect(tmpResult).to.have.length(0);
					}
				);

				test
				(
					'hashProjectNameToPort should return a port in the expected range.',
					function()
					{
						let tmpService = libQuackage.QuackageExampleService;

						let tmpPort1 = tmpService.hashProjectNameToPort('pict-section-form');
						Expect(tmpPort1).to.be.at.least(9000);
						Expect(tmpPort1).to.be.at.most(9500);

						let tmpPort2 = tmpService.hashProjectNameToPort('pict-section-objecteditor');
						Expect(tmpPort2).to.be.at.least(9000);
						Expect(tmpPort2).to.be.at.most(9500);

						// Same input should produce same output (deterministic)
						let tmpPort3 = tmpService.hashProjectNameToPort('pict-section-form');
						Expect(tmpPort3).to.equal(tmpPort1);

						// Different inputs should (very likely) produce different ports
						Expect(tmpPort1).to.not.equal(tmpPort2);
					}
				);

				test
				(
					'formatDisplayName should convert folder names to title case.',
					function()
					{
						let tmpService = libQuackage.QuackageExampleService;

						Expect(tmpService.formatDisplayName('simple_form')).to.equal('Simple Form');
						Expect(tmpService.formatDisplayName('complex-table')).to.equal('Complex Table');
						Expect(tmpService.formatDisplayName('debug')).to.equal('Debug');
						Expect(tmpService.formatDisplayName('my_cool-example')).to.equal('My Cool Example');
					}
				);

				test
				(
					'getMimeType should return correct MIME types.',
					function()
					{
						let tmpService = libQuackage.QuackageExampleService;

						Expect(tmpService.getMimeType('.html')).to.equal('text/html');
						Expect(tmpService.getMimeType('.js')).to.equal('text/javascript');
						Expect(tmpService.getMimeType('.css')).to.equal('text/css');
						Expect(tmpService.getMimeType('.json')).to.equal('application/json');
						Expect(tmpService.getMimeType('.png')).to.equal('image/png');
						Expect(tmpService.getMimeType('.svg')).to.equal('image/svg+xml');
						Expect(tmpService.getMimeType('.map')).to.equal('application/json');
						Expect(tmpService.getMimeType('.xyz')).to.equal('application/octet-stream');
					}
				);

				test
				(
					'generateIndexHTML should produce valid HTML with example links.',
					function()
					{
						let tmpService = libQuackage.QuackageExampleService;

						let tmpExamples = [
							{ Name: 'simple_form', DisplayName: 'Simple Form', RelativePath: 'simple_form/dist/index.html', Type: 'example' },
							{ Name: 'debug', DisplayName: 'Debug', RelativePath: 'debug/index.html', Type: 'debug' }
						];

						let tmpHTML = tmpService.generateIndexHTML('test-project', tmpExamples, 9123);

						Expect(tmpHTML).to.be.a('string');
						Expect(tmpHTML).to.include('<!DOCTYPE html>');
						Expect(tmpHTML).to.include('test-project');
						Expect(tmpHTML).to.include('simple_form/dist/index.html');
						Expect(tmpHTML).to.include('Simple Form');
						Expect(tmpHTML).to.include('debug/index.html');
						Expect(tmpHTML).to.include('Debug');
						Expect(tmpHTML).to.include('9123');
						Expect(tmpHTML).to.include('2 example(s) found');
						// Debug example should have the debug badge
						Expect(tmpHTML).to.include('type-badge debug');
					}
				);

				test
				(
					'gatherExampleFolders should find folders with package.json in a temp fixture.',
					function()
					{
						let tmpService = libQuackage.QuackageExampleService;

						// Create a temporary fixture
						let tmpFixtureBase = libPath.join(__dirname, 'tmp_fixture_examples');
						let tmpFixtureAppA = libPath.join(tmpFixtureBase, 'app_a');
						let tmpFixtureAppB = libPath.join(tmpFixtureBase, 'app_b');
						let tmpFixtureNoPackage = libPath.join(tmpFixtureBase, 'no_package');

						libFS.mkdirSync(tmpFixtureAppA, { recursive: true });
						libFS.mkdirSync(tmpFixtureAppB, { recursive: true });
						libFS.mkdirSync(tmpFixtureNoPackage, { recursive: true });

						libFS.writeFileSync(libPath.join(tmpFixtureAppA, 'package.json'), '{"name":"app_a"}');
						libFS.writeFileSync(libPath.join(tmpFixtureAppB, 'package.json'), '{"name":"app_b"}');

						let tmpResult = tmpService.gatherExampleFolders(tmpFixtureBase);
						Expect(tmpResult).to.be.an('array');
						Expect(tmpResult).to.have.length(2);
						Expect(tmpResult.map((pR) => pR.Name)).to.include('app_a');
						Expect(tmpResult.map((pR) => pR.Name)).to.include('app_b');

						// Cleanup
						libFS.unlinkSync(libPath.join(tmpFixtureAppA, 'package.json'));
						libFS.unlinkSync(libPath.join(tmpFixtureAppB, 'package.json'));
						libFS.rmdirSync(tmpFixtureAppA);
						libFS.rmdirSync(tmpFixtureAppB);
						libFS.rmdirSync(tmpFixtureNoPackage);
						libFS.rmdirSync(tmpFixtureBase);
					}
				);

				test
				(
					'gatherServableExamples should find examples with dist/index.html in a temp fixture.',
					function()
					{
						let tmpService = libQuackage.QuackageExampleService;

						// Create a temporary fixture
						let tmpFixtureBase = libPath.join(__dirname, 'tmp_fixture_serve');
						let tmpFixtureDist = libPath.join(tmpFixtureBase, 'my_app', 'dist');
						let tmpFixtureDebug = libPath.join(tmpFixtureBase, 'debug');
						let tmpFixtureEmpty = libPath.join(tmpFixtureBase, 'empty_app');

						libFS.mkdirSync(tmpFixtureDist, { recursive: true });
						libFS.mkdirSync(tmpFixtureDebug, { recursive: true });
						libFS.mkdirSync(tmpFixtureEmpty, { recursive: true });

						libFS.writeFileSync(libPath.join(tmpFixtureDist, 'index.html'), '<html></html>');
						libFS.writeFileSync(libPath.join(tmpFixtureDebug, 'index.html'), '<html></html>');

						let tmpResult = tmpService.gatherServableExamples(tmpFixtureBase);
						Expect(tmpResult).to.be.an('array');
						Expect(tmpResult).to.have.length(2);

						let tmpNames = tmpResult.map((pR) => pR.Name);
						Expect(tmpNames).to.include('my_app');
						Expect(tmpNames).to.include('debug');

						let tmpMyApp = tmpResult.find((pR) => pR.Name === 'my_app');
						Expect(tmpMyApp.RelativePath).to.equal('my_app/dist/index.html');
						Expect(tmpMyApp.Type).to.equal('example');

						let tmpDebug = tmpResult.find((pR) => pR.Name === 'debug');
						Expect(tmpDebug.RelativePath).to.equal('debug/index.html');
						Expect(tmpDebug.Type).to.equal('debug');

						// Cleanup
						libFS.unlinkSync(libPath.join(tmpFixtureDist, 'index.html'));
						libFS.unlinkSync(libPath.join(tmpFixtureDebug, 'index.html'));
						libFS.rmdirSync(tmpFixtureDist);
						libFS.rmdirSync(libPath.join(tmpFixtureBase, 'my_app'));
						libFS.rmdirSync(tmpFixtureDebug);
						libFS.rmdirSync(tmpFixtureEmpty);
						libFS.rmdirSync(tmpFixtureBase);
					}
				);
			}
		);

		suite
		(
			'Default Configuration',
			function()
			{
				test
				(
					'Default configuration should have expected GulpExecutions.',
					function()
					{
						let tmpConfig = require('../source/Default-Quackage-Configuration.json');
						Expect(tmpConfig).to.be.an('object');
						Expect(tmpConfig.GulpExecutions).to.be.an('array');
						Expect(tmpConfig.GulpExecutions.length).to.be.at.least(1);
						Expect(tmpConfig.GulpExecutions[0]).to.have.property('Hash');
						Expect(tmpConfig.GulpExecutions[0]).to.have.property('Name');
						Expect(tmpConfig.GulpExecutions[0]).to.have.property('BuildFileLabel');
						Expect(tmpConfig.GulpExecutions[0]).to.have.property('BrowsersListRC');
					}
				);

				test
				(
					'Default configuration should have GulpfileConfiguration with template placeholders.',
					function()
					{
						let tmpConfig = require('../source/Default-Quackage-Configuration.json');
						Expect(tmpConfig.GulpfileConfiguration).to.be.an('object');
						Expect(tmpConfig.GulpfileConfiguration).to.have.property('EntrypointInputSourceFile');
						Expect(tmpConfig.GulpfileConfiguration).to.have.property('LibraryObjectName');
						Expect(tmpConfig.GulpfileConfiguration).to.have.property('LibraryOutputFolder');
						Expect(tmpConfig.GulpfileConfiguration).to.have.property('LibraryUniminifiedFileName');
						Expect(tmpConfig.GulpfileConfiguration).to.have.property('LibraryMinifiedFileName');
					}
				);

				test
				(
					'Default configuration should have DefaultBabelRC with preset-env.',
					function()
					{
						let tmpConfig = require('../source/Default-Quackage-Configuration.json');
						Expect(tmpConfig.DefaultBabelRC).to.be.an('object');
						Expect(tmpConfig.DefaultBabelRC.presets).to.be.an('array');
						Expect(tmpConfig.DefaultBabelRC.presets).to.include('@babel/preset-env');
					}
				);

				test
				(
					'Default configuration should have PackageScripts.',
					function()
					{
						let tmpConfig = require('../source/Default-Quackage-Configuration.json');
						Expect(tmpConfig.PackageScripts).to.be.an('object');
						Expect(tmpConfig.PackageScripts).to.have.property('test');
						Expect(tmpConfig.PackageScripts).to.have.property('build');
						Expect(tmpConfig.PackageScripts).to.have.property('coverage');
					}
				);

				test
				(
					'Default configuration should have LuxuryPackageScripts.',
					function()
					{
						let tmpConfig = require('../source/Default-Quackage-Configuration.json');
						Expect(tmpConfig.LuxuryPackageScripts).to.be.an('object');
						Expect(tmpConfig.LuxuryPackageScripts).to.have.property('docker-dev-build');
						Expect(tmpConfig.LuxuryPackageScripts).to.have.property('docker-dev-run');
						Expect(tmpConfig.LuxuryPackageScripts).to.have.property('docker-dev-shell');
					}
				);
			}
		);

		suite
		(
			'Services',
			function()
			{
				test
				(
					'QuackageProcess service should be instantiated.',
					function()
					{
						Expect(libQuackage.QuackageProcess).to.be.an('object');
						Expect(libQuackage.QuackageProcess.execute).to.be.a('function');
						Expect(libQuackage.QuackageProcess.cwd).to.be.a('function');
						Expect(libQuackage.QuackageProcess.quackageFolder).to.be.a('function');
					}
				);

				test
				(
					'QuackageProcess.cwd should return a valid directory string.',
					function()
					{
						let tmpCWD = libQuackage.QuackageProcess.cwd();
						Expect(tmpCWD).to.be.a('string');
						Expect(tmpCWD.length).to.be.greaterThan(0);
						Expect(libFS.existsSync(tmpCWD)).to.equal(true);
					}
				);

				test
				(
					'QuackageProcess.quackageFolder should return a valid directory string.',
					function()
					{
						let tmpFolder = libQuackage.QuackageProcess.quackageFolder();
						Expect(tmpFolder).to.be.a('string');
						Expect(tmpFolder.length).to.be.greaterThan(0);
						Expect(libFS.existsSync(tmpFolder)).to.equal(true);
					}
				);

				test
				(
					'FilePersistence service should be instantiated.',
					function()
					{
						Expect(libQuackage.FilePersistence).to.be.an('object');
					}
				);

				test
				(
					'AppData should have CWD and Package loaded.',
					function()
					{
						Expect(libQuackage.AppData).to.be.an('object');
						Expect(libQuackage.AppData.CWD).to.be.a('string');
						Expect(libQuackage.AppData.QuackageFolder).to.be.a('string');
						Expect(libQuackage.AppData.Package).to.be.an('object');
						Expect(libQuackage.AppData.Package.name).to.equal('quackage');
					}
				);
			}
		);

		suite
		(
			'ProgramConfiguration',
			function()
			{
				test
				(
					'ProgramConfiguration should be loaded and have GulpExecutions.',
					function()
					{
						Expect(libQuackage.ProgramConfiguration).to.be.an('object');
						Expect(libQuackage.ProgramConfiguration.GulpExecutions).to.be.an('array');
					}
				);

				test
				(
					'ProgramConfiguration should have GulpfileConfiguration.',
					function()
					{
						Expect(libQuackage.ProgramConfiguration.GulpfileConfiguration).to.be.an('object');
					}
				);
			}
		);

		suite
		(
			'QuackageProcess Exit Codes',
			function()
			{
				test
				(
					'execute should call back without an error when the child exits 0.',
					function(fDone)
					{
						libQuackage.QuackageProcess.execute(process.execPath, [EXIT_FIXTURE, '0'], {},
							(pError) =>
							{
								Expect(pError).to.equal(undefined);
								return fDone();
							});
					}
				);

				test
				(
					'execute should call back with an Error carrying the code when the child exits 3.',
					function(fDone)
					{
						libQuackage.QuackageProcess.execute(process.execPath, [EXIT_FIXTURE, '3'], {},
							(pError) =>
							{
								Expect(pError).to.be.an('error');
								Expect(pError.ExitCode).to.equal(3);
								Expect(pError.Signal).to.equal(null);
								Expect(pError.Process).to.equal(process.execPath);
								Expect(pError.message).to.include('exited with code 3');
								Expect(libQuackage.QuackageProcess.exitCodeFromError(pError)).to.equal(3);
								return fDone();
							});
					}
				);

				test
				(
					'execute should call back with an Error when a signal kills the child.',
					function(fDone)
					{
						if (process.platform === 'win32')
						{
							// Windows has no POSIX signals to kill the fixture with.
							return this.skip();
						}
						libQuackage.QuackageProcess.execute(process.execPath, [EXIT_FIXTURE, 'SIGTERM'], {},
							(pError) =>
							{
								Expect(pError).to.be.an('error');
								Expect(pError.Signal).to.equal('SIGTERM');
								Expect(pError.ExitCode).to.equal(128 + libOS.constants.signals.SIGTERM);
								Expect(pError.message).to.include('SIGTERM');
								return fDone();
							});
					}
				);

				test
				(
					'execute should call back exactly once with an Error when the executable does not exist.',
					function(fDone)
					{
						let tmpCallbackCount = 0;
						let tmpCallbackError = null;
						libQuackage.QuackageProcess.execute('/this/quackage/executable/does/not/exist', [], {},
							(pError) =>
							{
								tmpCallbackCount++;
								tmpCallbackError = pError;
							});
						// A spawn failure emits 'error' and then 'close'; give both time to arrive.
						setTimeout(
							() =>
							{
								Expect(tmpCallbackCount).to.equal(1);
								Expect(tmpCallbackError).to.be.an('error');
								Expect(tmpCallbackError.code).to.equal('ENOENT');
								Expect(libQuackage.QuackageProcess.exitCodeFromError(tmpCallbackError)).to.equal(1);
								return fDone();
							}, 250);
					}
				);

				test
				(
					'exitCodeFromError should fall back to 1 when there is no child exit code.',
					function()
					{
						let tmpProcess = libQuackage.QuackageProcess;
						Expect(tmpProcess.exitCodeFromError(new Error('No exit code here'))).to.equal(1);
						Expect(tmpProcess.exitCodeFromError('a string error')).to.equal(1);
						Expect(tmpProcess.exitCodeFromError(undefined)).to.equal(1);

						let tmpZeroError = new Error('An exit code of 0 is not a failure code');
						tmpZeroError.ExitCode = 0;
						Expect(tmpProcess.exitCodeFromError(tmpZeroError)).to.equal(1);

						let tmpChildError = new Error('Child failed');
						tmpChildError.ExitCode = 34;
						Expect(tmpProcess.exitCodeFromError(tmpChildError)).to.equal(34);
					}
				);

				test
				(
					'findAncestorExecutable should find node_modules/.bin in a folder above the start folder.',
					function()
					{
						let tmpRoot = libFS.mkdtempSync(libPath.join(libOS.tmpdir(), 'quackage-ancestor-'));
						try
						{
							let tmpToolName = `quackage-ancestor-tool-${process.pid}`;
							let tmpBinFolder = libPath.join(tmpRoot, 'node_modules', '.bin');
							let tmpStartFolder = libPath.join(tmpRoot, 'modules', 'utility', 'some-module');
							libFS.mkdirSync(tmpBinFolder, { recursive: true });
							libFS.mkdirSync(tmpStartFolder, { recursive: true });
							libFS.writeFileSync(libPath.join(tmpBinFolder, tmpToolName), '');

							let tmpProcess = libQuackage.QuackageProcess;
							Expect(tmpProcess.findAncestorExecutable(tmpStartFolder, tmpToolName)).to.equal(libPath.join(tmpBinFolder, tmpToolName));
							// Nothing by this name exists anywhere above the start folder.
							Expect(tmpProcess.findAncestorExecutable(tmpStartFolder, `${tmpToolName}-missing`)).to.equal(false);
						}
						finally
						{
							libFS.rmSync(tmpRoot, { recursive: true, force: true });
						}
					}
				);
			}
		);

		suite
		(
			'Quack Command Exit Codes',
			function()
			{
				let tmpScratchFolders = [];

				teardown
				(
					function()
					{
						while (tmpScratchFolders.length > 0)
						{
							libFS.rmSync(tmpScratchFolders.pop(), { recursive: true, force: true });
						}
					}
				);

				test
				(
					'quack test should exit non-zero with mocha\'s code when tests fail.',
					function(fDone)
					{
						this.timeout(30000);
						let tmpModuleFolder = createScratchModule('failing',
							[
								`suite('Failing Module', function()`,
								`{`,
								`	test('passes', function() {});`,
								`	test('fails once', function() { throw new Error('Expected failure one'); });`,
								`	test('fails twice', function() { throw new Error('Expected failure two'); });`,
								`});`
							].join('\n'));
						tmpScratchFolders.push(tmpModuleFolder);

						runQuack(['test'], tmpModuleFolder,
							(pCode, pSignal, pOutput) =>
							{
								// Mocha exits with the number of failed tests; quack passes that through.
								Expect(pCode).to.equal(2, pOutput);
								Expect(pOutput).to.include('2 failing');
								Expect(pOutput).to.include('Expected failure two');
								Expect(pOutput).to.not.include('Process completed successfully');
								return fDone();
							});
					}
				);

				test
				(
					'quack test should exit 0 when every test passes.',
					function(fDone)
					{
						this.timeout(30000);
						let tmpModuleFolder = createScratchModule('passing',
							[
								`suite('Passing Module', function()`,
								`{`,
								`	test('passes', function() {});`,
								`});`
							].join('\n'));
						tmpScratchFolders.push(tmpModuleFolder);

						runQuack(['test'], tmpModuleFolder,
							(pCode, pSignal, pOutput) =>
							{
								Expect(pCode).to.equal(0, pOutput);
								Expect(pOutput).to.include('1 passing');
								Expect(pOutput).to.include('Process completed successfully');
								return fDone();
							});
					}
				);

				test
				(
					'quack should exit 1 when a command fails before running any process.',
					function(fDone)
					{
						this.timeout(30000);
						// docs-serve calls back with an Error straight away when the docs folder is missing.
						let tmpModuleFolder = createScratchModule('missingdocs', '');
						tmpScratchFolders.push(tmpModuleFolder);

						runQuack(['docs-serve', './this-docs-folder-does-not-exist'], tmpModuleFolder,
							(pCode, pSignal, pOutput) =>
							{
								Expect(pCode).to.equal(1, pOutput);
								Expect(pOutput).to.include('Documentation folder not found');
								Expect(pOutput).to.include('Quackage command failed; exiting with code 1');
								return fDone();
							});
					}
				);

				test
				(
					'run-mocha-tests should fail with an Error when mocha cannot be found.',
					function(fDone)
					{
						let tmpCommand = Object.values(libQuackage.servicesMap.CommandLineCommand).find(
							(pCommand) => pCommand.options.CommandKeyword === 'run-mocha-tests');
						Expect(tmpCommand).to.be.an('object');

						// Hide every mocha executable so each place quack looks comes up empty.
						let fOriginalExistsSync = libFS.existsSync;
						libFS.existsSync = (pPath) =>
						{
							return (libPath.basename(String(pPath)) === 'mocha') ? false : fOriginalExistsSync(pPath);
						};
						let fRestore = () => { libFS.existsSync = fOriginalExistsSync; };

						// Commander calls a command's action with (options, command).
						tmpCommand.runPromise({}, {}).then(
							() =>
							{
								fRestore();
								return fDone(new Error('run-mocha-tests resolved even though mocha could not be found.'));
							},
							(pError) =>
							{
								fRestore();
								try
								{
									Expect(pError).to.be.an('error');
									Expect(pError.message).to.include('installation of mocha');
									Expect(libQuackage.QuackageProcess.exitCodeFromError(pError)).to.equal(1);
								}
								catch (pAssertionError)
								{
									return fDone(pAssertionError);
								}
								return fDone();
							});
					}
				);
			}
		);

		suite
		(
			'Example Build Failures',
			function()
			{
				let tmpScratchFolders = [];

				// Make an example_applications folder of buildable examples (each
				// with node_modules, so no npm install is attempted).
				let createExamplesFolder = function(pExampleNames)
				{
					let tmpExamplesFolder = libFS.mkdtempSync(libPath.join(libOS.tmpdir(), 'quackage-examples-'));
					for (let i = 0; i < pExampleNames.length; i++)
					{
						let tmpExampleFolder = libPath.join(tmpExamplesFolder, pExampleNames[i]);
						libFS.mkdirSync(libPath.join(tmpExampleFolder, 'node_modules'), { recursive: true });
						libFS.writeFileSync(libPath.join(tmpExampleFolder, 'package.json'),
							JSON.stringify({ name: pExampleNames[i], scripts: { build: 'npx quack build' } }));
					}
					tmpScratchFolders.push(tmpExamplesFolder);
					return tmpExamplesFolder;
				};

				// Stand in for the process runner: record which example was built,
				// failing the build for the names in pFailingExamples.
				let stubExecute = function(pBuiltExamples, pFailingExamples)
				{
					libQuackage.QuackageProcess.execute = (pProcess, pArguments, pOptions, fCallback) =>
					{
						let tmpExampleName = libPath.basename(pOptions.cwd);
						pBuiltExamples.push(tmpExampleName);
						if (pFailingExamples.indexOf(tmpExampleName) > -1)
						{
							let tmpError = new Error(`Process [${pProcess}] exited with code 3.`);
							tmpError.ExitCode = 3;
							return fCallback(tmpError);
						}
						return fCallback();
					};
				};

				teardown
				(
					function()
					{
						// Drop the stub so the prototype's execute() is used again.
						delete libQuackage.QuackageProcess.execute;
						while (tmpScratchFolders.length > 0)
						{
							libFS.rmSync(tmpScratchFolders.pop(), { recursive: true, force: true });
						}
					}
				);

				test
				(
					'buildExamples should keep building after a failure, then report the failed examples.',
					function(fDone)
					{
						let tmpExamplesFolder = createExamplesFolder(['app_a', 'app_b', 'app_c']);
						let tmpBuiltExamples = [];
						stubExecute(tmpBuiltExamples, ['app_b']);

						libQuackage.QuackageExampleService.buildExamples(tmpExamplesFolder,
							(pError) =>
							{
								Expect(tmpBuiltExamples).to.have.members(['app_a', 'app_b', 'app_c']);
								Expect(pError).to.be.an('error');
								Expect(pError.message).to.include('1 of 3');
								Expect(pError.message).to.include('app_b');
								Expect(pError.message).to.not.include('app_a');
								return fDone();
							});
					}
				);

				test
				(
					'buildExamples should call back without an error when every example builds.',
					function(fDone)
					{
						let tmpExamplesFolder = createExamplesFolder(['app_a', 'app_b']);
						let tmpBuiltExamples = [];
						stubExecute(tmpBuiltExamples, []);

						libQuackage.QuackageExampleService.buildExamples(tmpExamplesFolder,
							(pError) =>
							{
								Expect(tmpBuiltExamples).to.have.members(['app_a', 'app_b']);
								Expect(pError).to.equal(undefined);
								return fDone();
							});
					}
				);
			}
		);
	}
);
