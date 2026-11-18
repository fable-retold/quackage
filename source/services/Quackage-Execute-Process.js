const libQuackageExecuteProcessBase = require(`./Quackage-Execute-Process-Base.js`);
const libChildProcess = require('child_process');
const libFS = require('fs');
const libOS = require('os');
const libPath = require('path');

class BaseQuackageProcessExecutionService extends libQuackageExecuteProcessBase
{
	constructor(pFable, pManifest, pServiceHash)
	{
		super(pFable, pManifest, pServiceHash);

		this.serviceType = 'QuackageProcess';

		this.LogToDirectConsole = true;
		this.LogToFableLog = false;
	}

	cwd()
	{
		return process.cwd();
	}

	quackageFolder()
	{
		return libPath.resolve(`${__dirname}/../..`);
	}

	exitParentProcess(pCode)
	{
		process.exit(pCode);
	}

	/**
	 * Find node_modules/.bin/<pName> in pStartFolder or the nearest folder above
	 * it that has one -- the same walk node does to resolve a package.  This is
	 * how a module inside a monorepo, whose tools are installed in an ancestor's
	 * node_modules (for instance the retold umbrella), still finds them.
	 *
	 * @param {string} pStartFolder - The folder to start looking from
	 * @param {string} pName - The executable name (e.g. 'mocha')
	 * @returns {string|boolean} The executable's path, or false when none is found
	 */
	findAncestorExecutable(pStartFolder, pName)
	{
		let tmpFolder = libPath.resolve(pStartFolder);
		let tmpPreviousFolder = null;
		while (tmpFolder !== tmpPreviousFolder)
		{
			let tmpCandidate = libPath.join(tmpFolder, 'node_modules', '.bin', pName);
			if (libFS.existsSync(tmpCandidate))
			{
				return tmpCandidate;
			}
			tmpPreviousFolder = tmpFolder;
			tmpFolder = libPath.dirname(tmpFolder);
		}
		return false;
	}

	/**
	 * Exit the parent (quack) process with pCode once stdout and stderr have
	 * finished writing.
	 *
	 * process.exit() drops writes that are still queued -- and pipes are
	 * asynchronous on macOS -- so exiting straight away can cut off the very
	 * output (mocha's failure summary, gulp's error) that explains why quack is
	 * exiting non-zero.  This records the code, waits for both streams to
	 * flush, then exits; the explicit exit means a leftover handle cannot keep
	 * a failed quack alive.
	 *
	 * @param {number} pCode - The exit code for the quack process
	 */
	exitParentProcessAfterOutput(pCode)
	{
		process.exitCode = pCode;
		process.stdout.write('',
			() =>
			{
				process.stderr.write('',
					() =>
					{
						process.exit(pCode);
					});
			});
	}

	/**
	 * Run a child process, streaming its output to the console.
	 *
	 * fCallback is called exactly once, after the child has exited and its
	 * output streams have closed:
	 *   - with no error when the child exits with code 0
	 *   - with an Error when the child exits non-zero, is killed by a signal or
	 *     cannot be started at all.  Exit and signal failures carry
	 *     `ExitCode` (the child's code, or 128 + the signal number), `Signal`
	 *     (the signal name or null) and `Process` (pProcess).
	 *
	 * @param {string} pProcess - The executable to run
	 * @param {Array<string>} pArguments - Arguments for the executable
	 * @param {object} pOptions - Options passed through to child_process.spawn
	 * @param {function} fCallback - Called with (pError)
	 */
	execute(pProcess, pArguments, pOptions, fCallback)
	{
		// Now log out what our execution would be!
		this.log.info(`Executing process: ${pProcess}`);
		this.log.trace(`Full command:  ${pProcess} ${pArguments.join(' ')}`, pOptions);

		// A child that cannot be started emits 'error' and then 'close' as well,
		// so make sure the caller only hears about the outcome once.
		let tmpCallbackFired = false;
		let fComplete = (pError) =>
		{
			if (tmpCallbackFired)
			{
				return;
			}
			tmpCallbackFired = true;
			return fCallback(pError);
		};

		// Now execute the process!
		const tmpProcess = libChildProcess.spawn(pProcess, pArguments, pOptions);

		tmpProcess.stdout.on('data',
			(pConsoleOutput) =>
			{
				if (this.LogToDirectConsole)
				{
					console.log(pConsoleOutput.toString());
				}
				if (this.LogToFableLog)
				{
					this.log.info(pConsoleOutput);
				}
			});
		tmpProcess.stderr.on('data',
			(pConsoleOutput) =>
			{
				if (this.LogToDirectConsole)
				{
					console.log(pConsoleOutput.toString());
				}
				if (this.LogToFableLog)
				{
					this.log.error(pConsoleOutput);
				}
			});

		// A broken output stream is worth a mention, but the child's own 'close'
		// still reports how it ended.
		tmpProcess.stdout.on('error',
			(pError) =>
			{
				this.log.error(`Error reading the output of process [${pProcess}]: ${pError.message}`);
			});
		tmpProcess.stderr.on('error',
			(pError) =>
			{
				this.log.error(`Error reading the error output of process [${pProcess}]: ${pError.message}`);
			});

		tmpProcess.on('error',
			(pError) =>
			{
				this.log.error(`Process execution failed in your quackage manager!  Process [${pProcess}] could not be run: ${pError.message}`);
				return fComplete(pError);
			});

		tmpProcess.on('close',
			(pCode, pSignal) =>
			{
				if (pSignal)
				{
					let tmpSignalNumber = libOS.constants.signals[pSignal];
					let tmpError = new Error(`Process [${pProcess}] was killed by signal ${pSignal}.`);
					// Follow the shell convention of 128 + the signal number.
					tmpError.ExitCode = (typeof (tmpSignalNumber) === 'number') ? (128 + tmpSignalNumber) : 1;
					tmpError.Signal = pSignal;
					tmpError.Process = pProcess;
					this.log.error(tmpError.message);
					return fComplete(tmpError);
				}

				if (pCode !== 0)
				{
					let tmpError = new Error(`Process [${pProcess}] exited with code ${pCode}.`);
					tmpError.ExitCode = pCode;
					tmpError.Signal = null;
					tmpError.Process = pProcess;
					this.log.error(tmpError.message);
					return fComplete(tmpError);
				}

				this.log.info(`Process completed successfully with a quack!`);
				return fComplete();
			});
	}
}

module.exports = BaseQuackageProcessExecutionService;