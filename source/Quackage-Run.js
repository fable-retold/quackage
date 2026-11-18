#!/usr/bin/env node
let libQuackage = require('./Quackage-CLIProgram.js');

// Run the command line utility directly (rather than through libQuackage.run(),
// which drops commander's promise) so a failed command decides quack's own
// exit code.  When a child process such as mocha or gulp exits non-zero, quack
// exits with that same code -- that is what lets `npm test` and prepublishOnly
// gates built on `npx quack test` actually stop a publish.
libQuackage.CommandLineUtility.run().catch(
	(pError) =>
	{
		let tmpExitCode = libQuackage.QuackageProcess.exitCodeFromError(pError);
		let tmpMessage = (pError && pError.message) ? pError.message : String(pError);
		libQuackage.log.error(`Quackage command failed; exiting with code ${tmpExitCode}.  ${tmpMessage}`);
		libQuackage.QuackageProcess.exitParentProcessAfterOutput(tmpExitCode);
	});