const libPict = require('pict');

class BaseQuackageProcessExecutionService extends libPict.ServiceProviderBase
{
	constructor(pFable, pManifest, pServiceHash)
	{
		super(pFable, pManifest, pServiceHash);

		this.serviceType = 'QuackageProcess';
	}

	cwd()
	{
		return `ABSTRACT_CWD`;
	}

	quackageFolder()
	{
		return `ABSTRACT_QUACKAGE_FOLDER`;
	}

	exitParentProcess(pCode)
	{
		return 'ABSTRACT_EXIT_PARENT_PROCESS';
	}

	exitParentProcessAfterOutput(pCode)
	{
		return 'ABSTRACT_EXIT_PARENT_PROCESS_AFTER_OUTPUT';
	}

	findAncestorExecutable(pStartFolder, pName)
	{
		return false;
	}

	/**
	 * The exit code quack should report for a failed command.
	 *
	 * A child process failure from execute() carries the child's own code in
	 * `ExitCode`; anything else (a missing executable, a thrown error) is 1.
	 *
	 * @param {Error} pError - The error the command failed with
	 * @returns {number} A non-zero exit code
	 */
	exitCodeFromError(pError)
	{
		if (pError && Number.isInteger(pError.ExitCode) && (pError.ExitCode > 0))
		{
			return pError.ExitCode;
		}
		return 1;
	}

	execute(pProcess, pArguments, pOptions, fCallback)
	{
		// Now log out what our execution would be!
		this.log.info(`Executing process: ${pProcess}`);
		this.log.trace(`Full command:  ${pProcess} ${pArguments.join(' ')}`, pOptions);

		return fCallback();
	}
}

module.exports = BaseQuackageProcessExecutionService;