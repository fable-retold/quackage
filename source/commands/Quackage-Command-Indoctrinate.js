const libCommandLineCommand = require('pict-service-commandlineutility').ServiceCommandLineCommand;
const libFS = require('fs');
const libPath = require('path');

class QuackageCommandIndoctrinate extends libCommandLineCommand
{
	constructor(pFable, pManifest, pServiceHash)
	{
		super(pFable, pManifest, pServiceHash);

		this.options.CommandKeyword = 'indoctrinate';
		this.options.Description = 'Generate a documentation catalog from module documentation folders using indoctrinate.';

		this.options.CommandArguments.push({ Name: '<docs_folder>', Description: 'The documentation output folder for the generated catalog.' });

		this.options.CommandOptions.push({ Name: '-d, --directory_root [directory_root]', Description: 'Root directory to scan for modules (defaults to CWD).', Default: '' });
		this.options.CommandOptions.push({ Name: '-b, --branch [branch]', Description: 'Git branch for GitHub raw URLs (defaults to master).', Default: 'master' });
		this.options.CommandOptions.push({ Name: '-g, --github_org [github_org]', Description: 'GitHub organization for raw URLs (defaults to fable-retold).', Default: 'fable-retold' });

		this.options.Aliases.push('indoc');

		this.addCommand();
	}

	onRunAsync(fCallback)
	{
		let tmpDocsFolder = libPath.resolve(this.ArgumentString || '.');
		let tmpDirectoryRoot = this.CommandOptions.directory_root || this.fable.AppData.CWD;
		let tmpBranch = this.CommandOptions.branch || 'master';
		let tmpGitHubOrg = this.CommandOptions.github_org || 'fable-retold';
		let tmpOutputFile = libPath.join(tmpDocsFolder, 'retold-catalog.json');

		this.log.info(`Generating documentation catalog with indoctrinate...`);
		this.log.info(`  Module root: ${tmpDirectoryRoot}`);
		this.log.info(`  Output: ${tmpOutputFile}`);

		// Ensure the output folder exists
		if (!libFS.existsSync(tmpDocsFolder))
		{
			this.log.info(`Creating documentation folder [${tmpDocsFolder}]...`);
			libFS.mkdirSync(tmpDocsFolder, { recursive: true });
		}

		// Find the indoctrinate binary
		let tmpIndoctrinateLocation = this.resolveExecutable('indoctrinate');
		if (!tmpIndoctrinateLocation)
		{
			return fCallback(new Error(`Could not find indoctrinate.  Make sure it is installed (npm install indoctrinate).`));
		}

		this.log.info(`Found indoctrinate at [${tmpIndoctrinateLocation}]`);

		this.fable.QuackageProcess.execute(
			tmpIndoctrinateLocation,
			[
				'generate_catalog',
				'-d', tmpDirectoryRoot,
				'-o', tmpOutputFile,
				'-b', tmpBranch,
				'-g', tmpGitHubOrg
			],
			{ cwd: this.fable.AppData.CWD },
			fCallback
		);
	}

	resolveExecutable(pName)
	{
		let tmpLocations =
			[
				`${this.fable.AppData.CWD}/node_modules/.bin/${pName}`,
				`${__dirname}/../../../.bin/${pName}`,
				`${__dirname}/../../node_modules/.bin/${pName}`
			];

		for (let i = 0; i < tmpLocations.length; i++)
		{
			if (libFS.existsSync(tmpLocations[i]))
			{
				return tmpLocations[i];
			}
		}

		return false;
	}
}

module.exports = QuackageCommandIndoctrinate;
