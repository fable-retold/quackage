const libCommandLineCommand = require('pict-service-commandlineutility').ServiceCommandLineCommand;
const libFS = require('fs');
const libPath = require('path');
const libChildProcess = require('child_process');

class QuackageCommandPrepareDocs extends libCommandLineCommand
{
	constructor(pFable, pManifest, pServiceHash)
	{
		super(pFable, pManifest, pServiceHash);

		this.options.CommandKeyword = 'prepare-docs';
		this.options.Description = 'Prepare documentation: generate catalog, build keyword index and inject pict-docuserve assets.';

		this.options.CommandArguments.push({ Name: '[docs_folder]', Description: 'The documentation folder to prepare.' });

		this.options.CommandOptions.push({ Name: '-d, --directory_root [directory_root]', Description: 'Root directory to scan for modules (defaults to CWD).', Default: '' });
		this.options.CommandOptions.push({ Name: '-b, --branch [branch]', Description: 'Git branch for GitHub raw URLs (defaults to master).', Default: 'master' });
		this.options.CommandOptions.push({ Name: '-g, --github_org [github_org]', Description: 'GitHub organization for raw URLs (defaults to stevenvelozo).', Default: 'stevenvelozo' });
		this.options.CommandOptions.push({ Name: '-x, --excluded_modules [excluded_modules]', Description: 'Comma-separated list of module names to exclude from the catalog and keyword index.  Merged with any ExcludedModules list in indoctrinate\'s loaded config file (e.g. .indoctrinate.config.json).', Default: '' });

		this.options.Aliases.push('docs');
		this.options.Aliases.push('prep-docs');

		this.addCommand();
	}

	onRunAsync(fCallback)
	{
		let tmpDocsFolder = libPath.resolve(this.ArgumentString || './docs');
		let tmpDirectoryRoot = this.CommandOptions.directory_root || this.fable.AppData.CWD;
		let tmpBranch = this.CommandOptions.branch || 'master';
		let tmpGitHubOrg = this.CommandOptions.github_org || 'stevenvelozo';

		// Exclusion list passthrough. When set, both indoctrinate sub-commands
		// get -x <list>.  Comma-separated; indoctrinate will merge this with
		// any ExcludedModules entries in its loaded config file.
		let tmpExcludedModulesArgs = [];
		if (this.CommandOptions.excluded_modules && this.CommandOptions.excluded_modules.length > 0)
		{
			tmpExcludedModulesArgs = ['-x', this.CommandOptions.excluded_modules];
		}

		this.log.info(`Preparing documentation in [${tmpDocsFolder}]...`);

		// Ensure the output folder exists
		if (!libFS.existsSync(tmpDocsFolder))
		{
			this.log.info(`Creating documentation folder [${tmpDocsFolder}]...`);
			libFS.mkdirSync(tmpDocsFolder, { recursive: true });
		}

		// Find the executables we need
		let tmpIndoctrinateLocation = this.resolveExecutable('indoctrinate');
		if (!tmpIndoctrinateLocation)
		{
			return fCallback(new Error(`Could not find indoctrinate.  Make sure it is installed (npm install indoctrinate).`));
		}

		let tmpDocuserveLocation = this.resolveExecutable('pict-docuserve');
		if (!tmpDocuserveLocation)
		{
			return fCallback(new Error(`Could not find pict-docuserve.  Make sure it is installed (npm install pict-docuserve).`));
		}

		let tmpCatalogFile = libPath.join(tmpDocsFolder, 'retold-catalog.json');
		let tmpKeywordIndexFile = libPath.join(tmpDocsFolder, 'retold-keyword-index.json');

		// Check if docs folder differs from module root — if so, we need to
		// also scan the docs folder for local content (architecture pages,
		// examples, etc.) so they appear in search results.
		let tmpDocsContentRoot = libPath.resolve(tmpDocsFolder);
		let tmpResolvedDirectoryRoot = libPath.resolve(tmpDirectoryRoot);
		let tmpExtraScanArgs = [];
		if (tmpDocsContentRoot !== tmpResolvedDirectoryRoot)
		{
			tmpExtraScanArgs = ['-e', tmpDocsContentRoot];
		}

		let tmpAnticipate = this.fable.newAnticipate();

		// Step 1: Generate the documentation catalog
		tmpAnticipate.anticipate(
			function (fNext)
			{
				this.log.info(`###############################[ STEP 1: INDOCTRINATE CATALOG ]###############################`);
				this.fable.QuackageProcess.execute(
					tmpIndoctrinateLocation,
					[
						'generate_catalog',
						'-d', tmpDirectoryRoot,
						'-o', tmpCatalogFile,
						'-b', tmpBranch,
						'-g', tmpGitHubOrg
					].concat(tmpExcludedModulesArgs),
					{ cwd: this.fable.AppData.CWD },
					fNext
				);
			}.bind(this));

		// Step 2: Generate the keyword search index
		tmpAnticipate.anticipate(
			function (fNext)
			{
				this.log.info(`###############################[ STEP 2: KEYWORD INDEX ]###############################`);
				this.fable.QuackageProcess.execute(
					tmpIndoctrinateLocation,
					[
						'generate_keyword_index',
						'-d', tmpDirectoryRoot,
						'-o', tmpKeywordIndexFile
					].concat(tmpExtraScanArgs).concat(tmpExcludedModulesArgs),
					{ cwd: this.fable.AppData.CWD },
					fNext
				);
			}.bind(this));

		// Step 3: Write _version.json version placard sidecar
		tmpAnticipate.anticipate(
			function (fNext)
			{
				this.log.info(`###############################[ STEP 3: VERSION PLACARD ]###############################`);
				try
				{
					let tmpPackageJsonPath = libPath.join(tmpDirectoryRoot, 'package.json');
					if (!libFS.existsSync(tmpPackageJsonPath))
					{
						this.log.warn(`No package.json at [${tmpPackageJsonPath}]; skipping _version.json generation.`);
						return fNext();
					}
					let tmpPackage = JSON.parse(libFS.readFileSync(tmpPackageJsonPath, 'utf8'));

					let tmpGitCommit = null;
					try
					{
						tmpGitCommit = libChildProcess.execSync('git rev-parse --short HEAD',
							{ cwd: tmpDirectoryRoot, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
					}
					catch (pGitErr)
					{
						// Non-git repo or no commits yet — omit GitCommit.
					}

					let tmpVersionPayload = {
						Name: tmpPackage.name || '',
						Version: tmpPackage.version || '',
						Description: tmpPackage.description || '',
						GeneratedAt: new Date().toISOString()
					};
					if (tmpGitCommit)
					{
						tmpVersionPayload.GitCommit = tmpGitCommit;
					}

					let tmpVersionFile = libPath.join(tmpDocsFolder, '_version.json');
					libFS.writeFileSync(tmpVersionFile, JSON.stringify(tmpVersionPayload, null, '\t'));
					this.log.info(`Wrote version placard: ${tmpVersionFile} (${tmpVersionPayload.Name} v${tmpVersionPayload.Version}${tmpGitCommit ? ' @ ' + tmpGitCommit : ''})`);
				}
				catch (pError)
				{
					this.log.warn(`Failed to write _version.json: ${pError.message}`);
				}
				return fNext();
			}.bind(this));

		// Step 4: Inject pict-docuserve assets
		tmpAnticipate.anticipate(
			function (fNext)
			{
				this.log.info(`###############################[ STEP 4: DOCUSERVE INJECT ]###############################`);
				this.fable.QuackageProcess.execute(
					tmpDocuserveLocation,
					[
						'inject',
						tmpDocsFolder
					],
					{ cwd: this.fable.AppData.CWD },
					fNext
				);
			}.bind(this));

		// Step 5: Stamp meaningful <title> and <meta name="description">
		// into the freshly-injected index.html so social-card scrapers
		// (Slack, etc.) read the module name + version instead of the
		// generic "powered by pict-docuserve" boilerplate.
		tmpAnticipate.anticipate(
			function (fNext)
			{
				this.log.info(`###############################[ STEP 5: STAMP HTML METADATA ]###############################`);
				try
				{
					let tmpIndexPath = libPath.join(tmpDocsFolder, 'index.html');
					if (!libFS.existsSync(tmpIndexPath))
					{
						this.log.warn(`No index.html at [${tmpIndexPath}]; skipping metadata stamp.`);
						return fNext();
					}

					let tmpVersionPath = libPath.join(tmpDocsFolder, '_version.json');
					let tmpVersion = null;
					if (libFS.existsSync(tmpVersionPath))
					{
						try { tmpVersion = JSON.parse(libFS.readFileSync(tmpVersionPath, 'utf8')); }
						catch (e) { this.log.warn(`Could not parse _version.json: ${e.message}`); }
					}

					// Prefer the H1 from _cover.md as the display name (it
					// has been hand-curated with proper casing and spacing);
					// fall back to package.json name from _version.json.
					let tmpDisplayName = '';
					let tmpCoverPath = libPath.join(tmpDocsFolder, '_cover.md');
					if (libFS.existsSync(tmpCoverPath))
					{
						let tmpCoverText = libFS.readFileSync(tmpCoverPath, 'utf8');
						let tmpH1Match = tmpCoverText.match(/^#\s+(.+?)\s*$/m);
						if (tmpH1Match)
						{
							tmpDisplayName = tmpH1Match[1].trim();
						}
					}
					if (!tmpDisplayName && tmpVersion && tmpVersion.Name)
					{
						tmpDisplayName = tmpVersion.Name;
					}
					if (!tmpDisplayName)
					{
						this.log.warn(`No display name available (no _cover.md H1 and no _version.json); leaving stock metadata.`);
						return fNext();
					}

					let tmpVersionString = (tmpVersion && tmpVersion.Version) ? ` v${tmpVersion.Version}` : '';
					let tmpTitle = `${tmpDisplayName}${tmpVersionString} Documentation`;
					let tmpDescription = tmpTitle;
					if (tmpVersion && tmpVersion.Description)
					{
						tmpDescription = `${tmpTitle} — ${tmpVersion.Description}`;
					}

					let tmpHTML = libFS.readFileSync(tmpIndexPath, 'utf8');

					// Escape for HTML attribute / element text contexts.
					let fHTMLEscape = (pText) => String(pText)
						.replace(/&/g, '&amp;')
						.replace(/</g, '&lt;')
						.replace(/>/g, '&gt;')
						.replace(/"/g, '&quot;');

					tmpHTML = tmpHTML.replace(
						/<title>[\s\S]*?<\/title>/i,
						`<title>${fHTMLEscape(tmpTitle)}</title>`
					);
					tmpHTML = tmpHTML.replace(
						/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
						`<meta name="description" content="${fHTMLEscape(tmpDescription)}">`
					);

					libFS.writeFileSync(tmpIndexPath, tmpHTML);
					this.log.info(`Stamped index.html metadata: "${tmpTitle}"`);
				}
				catch (pError)
				{
					this.log.warn(`Failed to stamp index.html metadata: ${pError.message}`);
				}
				return fNext();
			}.bind(this));

		return tmpAnticipate.wait(
			function (pError)
			{
				if (pError)
				{
					this.log.error(`Documentation preparation failed: ${pError.message}`);
					return fCallback(pError);
				}

				// Ensure .nojekyll exists for GitHub Pages compatibility
				let tmpNoJekyllPath = libPath.join(tmpDocsFolder, '.nojekyll');
				libFS.writeFileSync(tmpNoJekyllPath, '');
				this.log.info(`Wrote .nojekyll to [${tmpNoJekyllPath}]`);

				this.log.info(`Documentation preparation complete!`);
				this.log.info(`  Catalog: ${tmpCatalogFile}`);
				this.log.info(`  Keyword Index: ${tmpKeywordIndexFile}`);
				this.log.info(`  Docuserve assets injected into: ${tmpDocsFolder}`);

				return fCallback();
			}.bind(this));
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

module.exports = QuackageCommandPrepareDocs;
