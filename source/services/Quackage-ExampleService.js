const libPict = require('pict');
const libFS = require('fs');
const libPath = require('path');
const libHTTP = require('http');
const libHTTPS = require('https');
const libURL = require('url');

const libFable = require('fable');
const libBookstoreSchema = require('retold-harness/source/schemas/Retold-Harness-Service-Schema-Bookstore.js');
const libSQLiteProvider = require('retold-harness/source/providers/Retold-Harness-Service-Provider-SQLite.js');

class QuackageExampleService extends libPict.ServiceProviderBase
{
	constructor(pFable, pManifest, pServiceHash)
	{
		super(pFable, pManifest, pServiceHash);

		this.serviceType = 'QuackageExampleService';
	}

	// --- Folder scanning ---

	gatherExampleFolders(pBasePath)
	{
		let tmpExampleFolders = [];

		if (!libFS.existsSync(pBasePath))
		{
			return tmpExampleFolders;
		}

		let tmpEntries = libFS.readdirSync(pBasePath, { withFileTypes: true });
		for (let i = 0; i < tmpEntries.length; i++)
		{
			if (!tmpEntries[i].isDirectory())
			{
				continue;
			}

			let tmpDirName = tmpEntries[i].name;

			// Skip node_modules and hidden folders
			if (tmpDirName === 'node_modules' || tmpDirName.startsWith('.'))
			{
				continue;
			}

			let tmpFolderPath = libPath.join(pBasePath, tmpDirName);
			let tmpPackagePath = libPath.join(tmpFolderPath, 'package.json');

			if (libFS.existsSync(tmpPackagePath))
			{
				tmpExampleFolders.push(
					{
						Name: tmpDirName,
						Path: tmpFolderPath,
						PackagePath: tmpPackagePath
					});
			}
		}

		return tmpExampleFolders;
	}

	gatherServableExamples(pBasePath)
	{
		let tmpExamples = [];

		if (!libFS.existsSync(pBasePath))
		{
			return tmpExamples;
		}

		let tmpEntries = libFS.readdirSync(pBasePath, { withFileTypes: true });
		for (let i = 0; i < tmpEntries.length; i++)
		{
			if (!tmpEntries[i].isDirectory())
			{
				continue;
			}

			let tmpDirName = tmpEntries[i].name;

			// Skip node_modules and hidden folders
			if (tmpDirName === 'node_modules' || tmpDirName.startsWith('.'))
			{
				continue;
			}

			let tmpFolderPath = libPath.join(pBasePath, tmpDirName);

			// Check for dist/index.html (standard example pattern)
			let tmpDistIndex = libPath.join(tmpFolderPath, 'dist', 'index.html');
			if (libFS.existsSync(tmpDistIndex))
			{
				// Try to get a nice name from package.json
				let tmpDisplayName = this.formatDisplayName(tmpDirName);
				let tmpPackagePath = libPath.join(tmpFolderPath, 'package.json');
				if (libFS.existsSync(tmpPackagePath))
				{
					try
					{
						let tmpPkg = JSON.parse(libFS.readFileSync(tmpPackagePath, 'utf8'));
						if (tmpPkg.description)
						{
							tmpDisplayName = tmpPkg.description;
						}
					}
					catch (pError)
					{
						// Use the formatted folder name
					}
				}

				tmpExamples.push(
					{
						Name: tmpDirName,
						DisplayName: tmpDisplayName,
						RelativePath: `${tmpDirName}/dist/index.html`,
						Type: 'example'
					});
				continue;
			}

			// Check for direct index.html (debug folder pattern)
			let tmpDirectIndex = libPath.join(tmpFolderPath, 'index.html');
			if (libFS.existsSync(tmpDirectIndex))
			{
				tmpExamples.push(
					{
						Name: tmpDirName,
						DisplayName: this.formatDisplayName(tmpDirName),
						RelativePath: `${tmpDirName}/index.html`,
						Type: 'debug'
					});
			}
		}

		return tmpExamples;
	}

	// --- Display helpers ---

	formatDisplayName(pFolderName)
	{
		// Convert folder_name to Title Case Display Name
		return pFolderName
			.split(/[-_]/)
			.map((pWord) => pWord.charAt(0).toUpperCase() + pWord.slice(1))
			.join(' ');
	}

	hashProjectNameToPort(pProjectName)
	{
		let tmpHash = 0;
		for (let i = 0; i < pProjectName.length; i++)
		{
			let tmpChar = pProjectName.charCodeAt(i);
			tmpHash = ((tmpHash << 5) - tmpHash) + tmpChar;
			tmpHash = tmpHash & tmpHash; // Convert to 32-bit integer
		}
		// Map to range 9000-9500
		return 9000 + (Math.abs(tmpHash) % 501);
	}

	getMimeType(pExtension)
	{
		let tmpMimeTypes =
			{
				'.html': 'text/html',
				'.js': 'text/javascript',
				'.css': 'text/css',
				'.json': 'application/json',
				'.png': 'image/png',
				'.jpg': 'image/jpeg',
				'.jpeg': 'image/jpeg',
				'.gif': 'image/gif',
				'.svg': 'image/svg+xml',
				'.ico': 'image/x-icon',
				'.woff': 'font/woff',
				'.woff2': 'font/woff2',
				'.ttf': 'font/ttf',
				'.map': 'application/json'
			};
		return tmpMimeTypes[pExtension] || 'application/octet-stream';
	}

	// --- HTML generation ---

	generateIndexHTML(pProjectName, pExamples, pPort)
	{
		let tmpExampleListItems = '';
		for (let i = 0; i < pExamples.length; i++)
		{
			let tmpExample = pExamples[i];
			let tmpTypeLabel = tmpExample.Type === 'debug' ? ' <span class="type-badge debug">debug</span>' : '';
			tmpExampleListItems += `\t\t\t<li><a href="${tmpExample.RelativePath}">${tmpExample.DisplayName}${tmpTypeLabel}</a></li>\n`;
		}

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Examples - ${pProjectName}</title>
	<style>
		*, *::before, *::after { box-sizing: border-box; }
		body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #FAEDCD; color: #264653; }

		/* --- Header Bar --- */
		.pict-example-header { display: flex; align-items: stretch; background: #264653; border-bottom: 3px solid #E76F51; }
		.pict-example-badge { background: #E76F51; color: #fff; padding: 0.6rem 1rem; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 0.5rem; }
		.pict-example-badge svg { width: 14px; height: 14px; fill: #fff; flex-shrink: 0; }
		.pict-example-app-name { padding: 0.6rem 1rem; color: #FAEDCD; font-size: 1.1rem; font-weight: 600; display: flex; align-items: center; }
		.pict-example-module { margin-left: auto; padding: 0.6rem 1rem; color: #D4A373; font-size: 0.75rem; display: flex; align-items: center; letter-spacing: 0.03em; }

		/* --- Content Area --- */
		.pict-example-content { max-width: 800px; margin: 0 auto; padding: 2rem 1.5rem; }
		.pict-example-content h1 { color: #264653; font-size: 1.5rem; margin: 0 0 0.5rem; }
		.pict-example-content .subtitle { color: #6B705C; font-size: 0.85rem; margin: 0 0 1.5rem; }

		/* --- Example List --- */
		.example-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
		.example-list li { background: #fff; border: 1px solid #D4A373; border-left: 4px solid #E76F51; border-radius: 4px; transition: border-color 0.15s, box-shadow 0.15s; }
		.example-list li:hover { border-left-color: #264653; box-shadow: 0 2px 8px rgba(38,70,83,0.1); }
		.example-list a { display: block; padding: 0.75rem 1rem; text-decoration: none; color: #264653; font-weight: 500; font-size: 0.95rem; }
		.example-list a:hover { color: #E76F51; }

		/* --- Type Badge --- */
		.type-badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 3px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; vertical-align: middle; margin-left: 0.5rem; }
		.type-badge.debug { background: #264653; color: #FAEDCD; }

		/* --- Footer --- */
		.pict-example-footer { text-align: center; padding: 1.5rem; color: #6B705C; font-size: 0.75rem; border-top: 1px solid #D4A373; margin-top: 2rem; }
	</style>
</head>
<body>
	<div class="pict-example-header">
		<div class="pict-example-badge">
			<svg viewBox="0 0 16 16"><polygon points="8,1 10,6 16,6 11,9.5 13,15 8,11.5 3,15 5,9.5 0,6 6,6"/></svg>
			Pict Example
		</div>
		<div class="pict-example-app-name">Example Index</div>
		<div class="pict-example-module">${pProjectName}</div>
	</div>
	<div class="pict-example-content">
		<h1>Example Applications</h1>
		<p class="subtitle">${pExamples.length} example(s) found &mdash; served on port ${pPort}</p>
		<ul class="example-list">
${tmpExampleListItems}		</ul>
	</div>
	<div class="pict-example-footer">
		Served by quackage examples-serve
	</div>
</body>
</html>`;
	}

	// --- Executable resolution ---

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

		// Fall back to just the bare command name (rely on PATH)
		return pName;
	}

	// --- Build all examples ---

	buildExamples(pExamplesFolder, fCallback)
	{
		let tmpExamplesFolder = libPath.resolve(pExamplesFolder || './example_applications');

		this.log.info(`Building all examples in [${tmpExamplesFolder}] ...`);

		// Gather example folders from example_applications and debug
		let tmpExampleFolders = this.gatherExampleFolders(tmpExamplesFolder);
		let tmpDebugFolder = libPath.join(tmpExamplesFolder, 'debug');
		let tmpDebugPackage = libPath.join(tmpDebugFolder, 'package.json');
		if (libFS.existsSync(tmpDebugPackage))
		{
			let tmpAlreadyIncluded = tmpExampleFolders.some((pFolder) => pFolder.Name === 'debug');
			if (!tmpAlreadyIncluded)
			{
				tmpExampleFolders.push(
					{
						Name: 'debug',
						Path: tmpDebugFolder,
						PackagePath: tmpDebugPackage
					});
			}
		}

		if (tmpExampleFolders.length < 1)
		{
			this.log.warn(`No example application folders with package.json found in [${tmpExamplesFolder}].`);
			return fCallback();
		}

		this.log.info(`Found ${tmpExampleFolders.length} example application(s) to build.`);

		// Build each example in series
		this.fable.Utility.eachLimit(
			tmpExampleFolders, 1,
			(pExample, fExampleCallback) =>
			{
				this.log.info(`####### Building example: ${pExample.Name} #######`);

				let tmpPackage;
				try
				{
					tmpPackage = JSON.parse(libFS.readFileSync(pExample.PackagePath, 'utf8'));
				}
				catch (pError)
				{
					this.log.error(`Error reading package.json for [${pExample.Name}]: ${pError.message}`);
					return fExampleCallback();
				}

				if (!tmpPackage.scripts || !tmpPackage.scripts.build)
				{
					this.log.warn(`No build script in [${pExample.Name}] -- skipping.`);
					return fExampleCallback();
				}

				let tmpNpxLocation = this.resolveExecutable('npx');
				let tmpNpmLocation = this.resolveExecutable('npm');

				// Install dependencies if node_modules does not exist
				let tmpNodeModulesPath = libPath.join(pExample.Path, 'node_modules');
				let tmpRunBuild = () =>
				{
					this.fable.QuackageProcess.execute(
						tmpNpxLocation,
						['quack', 'build'],
						{ cwd: pExample.Path },
						(pBuildError) =>
						{
							if (pBuildError)
							{
								this.log.error(`Build error in [${pExample.Name}]: ${pBuildError.message}`);
							}

							if (tmpPackage.copyFiles || tmpPackage.copyFilesSettings)
							{
								this.log.info(`Copying files for [${pExample.Name}] ...`);
								this.fable.QuackageProcess.execute(
									tmpNpxLocation,
									['quack', 'copy'],
									{ cwd: pExample.Path },
									(pCopyError) =>
									{
										if (pCopyError)
										{
											this.log.error(`Copy error in [${pExample.Name}]: ${pCopyError.message}`);
										}
										return fExampleCallback();
									});
							}
							else
							{
								return fExampleCallback();
							}
						});
				};

				if (!libFS.existsSync(tmpNodeModulesPath))
				{
					this.log.info(`Installing dependencies for [${pExample.Name}] ...`);
					this.fable.QuackageProcess.execute(
						tmpNpmLocation,
						['install'],
						{ cwd: pExample.Path },
						(pInstallError) =>
						{
							if (pInstallError)
							{
								this.log.error(`Install error in [${pExample.Name}]: ${pInstallError.message}`);
								return fExampleCallback();
							}
							tmpRunBuild();
						});
				}
				else
				{
					tmpRunBuild();
				}
			},
			(pError) =>
			{
				if (pError)
				{
					this.log.error(`Error building examples: ${pError.message}`);
				}
				else
				{
					this.log.info(`All examples built successfully!`);
				}
				return fCallback(pError);
			});
	}

	// --- Bookstore API initialization ---

	initializeBookstoreAPI(pPort, pDataFolder, fCallback)
	{
		let tmpSQLitePath = libPath.join(pDataFolder, '.data', 'bookstore.sqlite');
		let tmpDataDir = libPath.dirname(tmpSQLitePath);
		if (!libFS.existsSync(tmpDataDir))
		{
			libFS.mkdirSync(tmpDataDir, { recursive: true });
		}

		let tmpSettings =
			{
				"Product": "QuackageExampleServer",
				"ProductVersion": "1.0.0",
				"APIServerPort": pPort,
				"SQLite":
				{
					"SQLiteFilePath": tmpSQLitePath
				}
			};

		let tmpHarnessFable = new libFable(tmpSettings);

		// Register the bookstore schema provider
		tmpHarnessFable.serviceManager.addServiceType('HarnessSchemaProvider', libBookstoreSchema);
		tmpHarnessFable.serviceManager.instantiateServiceProvider('HarnessSchemaProvider');

		// Register the SQLite provider configurator
		tmpHarnessFable.serviceManager.addServiceType('MeadowProviderConfigurator', libSQLiteProvider);
		tmpHarnessFable.serviceManager.instantiateServiceProvider('MeadowProviderConfigurator');

		// Skip the default web UI route -- we will register our own routes after initialization
		tmpHarnessFable.MeadowProviderConfigurator.serveWebUI = (fStepCallback) => { return fStepCallback(); };

		// Initialize the harness (connects DB, creates tables, seeds data, registers API endpoints, starts Orator)
		tmpHarnessFable.MeadowProviderConfigurator.initializeHarness(
			(pError) =>
			{
				if (pError)
				{
					return fCallback(pError);
				}
				return fCallback(null, tmpHarnessFable);
			});
	}

	// --- Serve static files via a raw HTTP server (fallback when retold-harness unavailable) ---

	serveStaticHTTP(pExamplesFolder, pIndexHTML, pPort, fCallback)
	{
		let tmpServer = libHTTP.createServer(
			(pRequest, pResponse) =>
			{
				let tmpRequestURL = pRequest.url.split('?')[0];

				if (tmpRequestURL === '/' || tmpRequestURL === '/index.html')
				{
					pResponse.writeHead(200, { 'Content-Type': 'text/html' });
					pResponse.end(pIndexHTML);
					return;
				}

				let tmpFilePath = libPath.join(pExamplesFolder, decodeURIComponent(tmpRequestURL));

				if (!tmpFilePath.startsWith(pExamplesFolder))
				{
					pResponse.writeHead(403);
					pResponse.end('Forbidden');
					return;
				}

				if (libFS.existsSync(tmpFilePath) && libFS.statSync(tmpFilePath).isDirectory())
				{
					tmpFilePath = libPath.join(tmpFilePath, 'index.html');
				}

				if (!libFS.existsSync(tmpFilePath))
				{
					pResponse.writeHead(404);
					pResponse.end('Not Found');
					return;
				}

				let tmpExtension = libPath.extname(tmpFilePath).toLowerCase();
				let tmpMimeType = this.getMimeType(tmpExtension);

				try
				{
					let tmpContent = libFS.readFileSync(tmpFilePath);
					pResponse.writeHead(200, { 'Content-Type': tmpMimeType });
					pResponse.end(tmpContent);
				}
				catch (pError)
				{
					pResponse.writeHead(500);
					pResponse.end('Internal Server Error');
				}
			});

		tmpServer.listen(pPort,
			() =>
			{
				this.log.info(`  Static-only server running at http://localhost:${pPort}/`);
			});

		tmpServer.on('error',
			(pError) =>
			{
				if (pError.code === 'EADDRINUSE')
				{
					this.log.error(`Port ${pPort} is already in use.  Try specifying a different port with -p.`);
				}
				else
				{
					this.log.error(`Server error: ${pError.message}`);
				}
				return fCallback(pError);
			});
	}

	// --- Serve static + reverse-proxy a configured upstream ---

	/**
	 * Serve example files out of pExamplesFolder, but reverse-proxy any request
	 * whose path starts with one of pProxyConfig.paths to pProxyConfig.upstream.
	 *
	 * Used by mode='proxy' so cookie-credentialed APIs (Headlight, etc.) appear
	 * same-origin to the browser and CORS doesn't get in the way.
	 */
	serveStaticWithProxy(pExamplesFolder, pIndexHTML, pPort, pExamples, pProjectName, pProxyConfig, fCallback)
	{
		const tmpUpstreamParsed = libURL.parse(pProxyConfig.upstream);
		const tmpUpstreamClient = (tmpUpstreamParsed.protocol === 'https:') ? libHTTPS : libHTTP;
		const tmpUpstreamHost = tmpUpstreamParsed.host;
		const tmpUpstreamOrigin = `${tmpUpstreamParsed.protocol}//${tmpUpstreamHost}`;

		const tmpShouldProxy = (pRequestPath) =>
		{
			for (let i = 0; i < pProxyConfig.paths.length; i++)
			{
				if (pRequestPath === pProxyConfig.paths[i] || pRequestPath.indexOf(pProxyConfig.paths[i]) === 0)
				{
					return true;
				}
			}
			return false;
		};

		const tmpRewriteSetCookie = (pCookies) =>
		{
			if (!pCookies) { return pCookies; }
			const tmpArray = Array.isArray(pCookies) ? pCookies : [pCookies];
			return tmpArray.map((pCookie) => String(pCookie)
				.replace(/;\s*Domain=[^;]+/i, '')
				.replace(/;\s*Secure/i, ''));
		};

		const tmpProxyRequest = (pRequest, pResponse) =>
		{
			const tmpProxyHeaders = Object.assign({}, pRequest.headers);
			if (pProxyConfig.rewriteOrigin)
			{
				tmpProxyHeaders.host = tmpUpstreamHost;
				if (tmpProxyHeaders.origin)  { tmpProxyHeaders.origin  = tmpUpstreamOrigin; }
				if (tmpProxyHeaders.referer) { tmpProxyHeaders.referer = tmpUpstreamOrigin + '/'; }
			}
			delete tmpProxyHeaders['accept-encoding'];

			const tmpProxyOptions =
			{
				protocol: tmpUpstreamParsed.protocol,
				hostname: tmpUpstreamParsed.hostname,
				port:     tmpUpstreamParsed.port || (tmpUpstreamParsed.protocol === 'https:' ? 443 : 80),
				method:   pRequest.method,
				path:     pRequest.url,
				headers:  tmpProxyHeaders
			};

			const tmpProxyReq = tmpUpstreamClient.request(tmpProxyOptions, (pProxyRes) =>
			{
				const tmpResponseHeaders = Object.assign({}, pProxyRes.headers);
				if (pProxyConfig.rewriteCookies && tmpResponseHeaders['set-cookie'])
				{
					tmpResponseHeaders['set-cookie'] = tmpRewriteSetCookie(tmpResponseHeaders['set-cookie']);
				}
				pResponse.writeHead(pProxyRes.statusCode || 502, tmpResponseHeaders);
				pProxyRes.pipe(pResponse);
			});

			tmpProxyReq.on('error', (pError) =>
			{
				this.log.error(`Proxy upstream error for ${pRequest.method} ${pRequest.url}: ${pError.message}`);
				if (!pResponse.headersSent)
				{
					pResponse.writeHead(502, { 'Content-Type': 'text/plain' });
				}
				pResponse.end(`Bad gateway: ${pError.message}`);
			});

			pRequest.pipe(tmpProxyReq);
		};

		const tmpServeStaticFile = (pRequest, pResponse) =>
		{
			let tmpRequestURL = pRequest.url.split('?')[0];

			if (tmpRequestURL === '/' || tmpRequestURL === '/index.html')
			{
				pResponse.writeHead(200, { 'Content-Type': 'text/html' });
				pResponse.end(pIndexHTML);
				return;
			}

			let tmpFilePath = libPath.join(pExamplesFolder, decodeURIComponent(tmpRequestURL));
			if (!tmpFilePath.startsWith(pExamplesFolder))
			{
				pResponse.writeHead(403);
				pResponse.end('Forbidden');
				return;
			}
			if (libFS.existsSync(tmpFilePath) && libFS.statSync(tmpFilePath).isDirectory())
			{
				tmpFilePath = libPath.join(tmpFilePath, 'index.html');
			}
			if (!libFS.existsSync(tmpFilePath))
			{
				pResponse.writeHead(404);
				pResponse.end('Not Found');
				return;
			}

			let tmpExtension = libPath.extname(tmpFilePath).toLowerCase();
			let tmpMimeType = this.getMimeType(tmpExtension);
			try
			{
				let tmpContent = libFS.readFileSync(tmpFilePath);
				pResponse.writeHead(200, { 'Content-Type': tmpMimeType });
				pResponse.end(tmpContent);
			}
			catch (pReadError)
			{
				pResponse.writeHead(500);
				pResponse.end('Internal Server Error');
			}
		};

		const tmpServer = libHTTP.createServer((pRequest, pResponse) =>
		{
			const tmpPath = pRequest.url.split('?')[0];
			if (tmpShouldProxy(tmpPath))
			{
				tmpProxyRequest(pRequest, pResponse);
			}
			else
			{
				tmpServeStaticFile(pRequest, pResponse);
			}
		});

		tmpServer.listen(pPort, () =>
		{
			this.log.info(`##############################################`);
			this.log.info(`  Example server running at http://localhost:${pPort}/`);
			this.log.info(`  Project: ${pProjectName}`);
			this.log.info(`  Proxy upstream: ${pProxyConfig.upstream}`);
			this.log.info(`  Proxied paths:  ${pProxyConfig.paths.join(', ')}`);
			this.log.info(`  Serving ${pExamples.length} example(s):`);
			for (let i = 0; i < pExamples.length; i++)
			{
				this.log.info(`    - ${pExamples[i].DisplayName}: http://localhost:${pPort}/${pExamples[i].RelativePath}`);
			}
			this.log.info(`##############################################`);
			this.log.info(`Press Ctrl+C to stop.`);
		});

		tmpServer.on('error', (pError) =>
		{
			if (pError.code === 'EADDRINUSE')
			{
				this.log.error(`Port ${pPort} is already in use.  Try specifying a different port with -p.`);
			}
			else
			{
				this.log.error(`Server error: ${pError.message}`);
			}
			return fCallback(pError);
		});
	}

	// --- Per-project examples configuration ---

	/**
	 * Resolve the host project's examples configuration from its package.json.
	 * Reads `quackageExamples` (preferred) or `quack.examples` (alias).
	 *
	 * Recognised shapes:
	 *
	 *   "quackageExamples": { "mode": "bookstore" }   // default — Meadow + SQLite + bookstore data
	 *   "quackageExamples": { "mode": "static"   }    // serve files only, no API
	 *   "quackageExamples": {
	 *       "mode": "proxy",
	 *       "proxy": {
	 *           "upstream": "https://fieldbook.qa.headlight.com",
	 *           "paths": ["/1.0/", "/CheckSession", "/Authenticate", "/Report/"],
	 *           "rewriteCookies": true,
	 *           "rewriteOrigin":  true
	 *       }
	 *   }
	 *
	 * Defaults (mode='proxy'):
	 *   paths           = ["/1.0/"]
	 *   rewriteCookies  = true     (strip Domain= and Secure so localhost keeps the session)
	 *   rewriteOrigin   = true     (rewrite Host/Origin/Referer to the upstream)
	 */
	resolveExamplesConfig()
	{
		const tmpPackage = (this.fable && this.fable.AppData && this.fable.AppData.Package) || {};
		const tmpRaw = tmpPackage.quackageExamples
			|| (tmpPackage.quack && tmpPackage.quack.examples)
			|| {};

		const tmpMode = (typeof tmpRaw.mode === 'string') ? tmpRaw.mode.toLowerCase() : 'bookstore';
		const tmpResolved = { mode: tmpMode };

		if (tmpMode === 'proxy')
		{
			const tmpProxy = tmpRaw.proxy || {};
			tmpResolved.proxy =
			{
				upstream:       (typeof tmpProxy.upstream === 'string' && tmpProxy.upstream) ? tmpProxy.upstream.replace(/\/+$/, '') : null,
				paths:          (Array.isArray(tmpProxy.paths) && tmpProxy.paths.length) ? tmpProxy.paths.slice() : ['/1.0/'],
				rewriteCookies: (tmpProxy.rewriteCookies !== false),
				rewriteOrigin:  (tmpProxy.rewriteOrigin !== false)
			};
			// Allow env-var override for the upstream so devs can switch envs without
			// editing package.json: `UPSTREAM=https://fieldbook.headlight.com npx quack examples`.
			if (process.env.QUACKAGE_PROXY_UPSTREAM)
			{
				tmpResolved.proxy.upstream = process.env.QUACKAGE_PROXY_UPSTREAM.replace(/\/+$/, '');
			}
			else if (process.env.UPSTREAM)
			{
				tmpResolved.proxy.upstream = process.env.UPSTREAM.replace(/\/+$/, '');
			}
		}

		return tmpResolved;
	}

	// --- Serve examples ---

	serveExamples(pExamplesFolder, pPort, fCallback)
	{
		let tmpExamplesFolder = libPath.resolve(pExamplesFolder || './example_applications');
		let tmpProjectName = this.fable.AppData.Package.name || 'unknown-project';
		let tmpPort = pPort || this.hashProjectNameToPort(tmpProjectName);

		this.log.info(`Scanning for example applications in [${tmpExamplesFolder}] ...`);

		let tmpExamples = this.gatherServableExamples(tmpExamplesFolder);

		if (tmpExamples.length < 1)
		{
			this.log.warn(`No servable examples found in [${tmpExamplesFolder}].  Looking for subfolders with dist/index.html or index.html.`);
			return fCallback();
		}

		this.log.info(`Found ${tmpExamples.length} servable example(s).`);

		let tmpIndexHTML = this.generateIndexHTML(tmpProjectName, tmpExamples, tmpPort);

		const tmpConfig = this.resolveExamplesConfig();

		if (tmpConfig.mode === 'proxy')
		{
			if (!tmpConfig.proxy.upstream)
			{
				this.log.error(`quackageExamples.mode is 'proxy' but no upstream URL was configured.`);
				this.log.error(`Set quackageExamples.proxy.upstream in package.json (or QUACKAGE_PROXY_UPSTREAM / UPSTREAM env var).`);
				return fCallback(new Error('Proxy mode requires an upstream.'));
			}
			this.log.info(`Examples mode: proxy → ${tmpConfig.proxy.upstream}`);
			this.log.info(`Proxying paths: ${tmpConfig.proxy.paths.join(', ')}`);
			return this.serveStaticWithProxy(tmpExamplesFolder, tmpIndexHTML, tmpPort, tmpExamples, tmpProjectName, tmpConfig.proxy, fCallback);
		}

		if (tmpConfig.mode === 'static')
		{
			this.log.info(`Examples mode: static (no API)`);
			return this.serveStaticHTTP(tmpExamplesFolder, tmpIndexHTML, tmpPort, fCallback);
		}

		// Default: bookstore API
		this.log.info(`Initializing bookstore API with SQLite ...`);
		this.initializeBookstoreAPI(tmpPort, tmpExamplesFolder,
			(pError, pHarnessFable) =>
			{
				if (pError)
				{
					this.log.warn(`Bookstore API initialization failed: ${pError}`);
					this.log.warn(`Falling back to static-only file server.`);
					this.serveStaticHTTP(tmpExamplesFolder, tmpIndexHTML, tmpPort, fCallback);
					return;
				}

				// The Orator/Restify server is now running with all Meadow API endpoints.
				// Add static file serving routes to it.
				let tmpRestifyServer = pHarnessFable.OratorServiceServer.server;

				// Serve the example index page at /
				tmpRestifyServer.get('/',
					(pRequest, pResponse, fNext) =>
					{
						pResponse.writeHead(200, { 'Content-Type': 'text/html' });
						pResponse.end(tmpIndexHTML);
						return fNext();
					});

				// Serve static example files as a catch-all (registered last so Meadow API routes take priority)
				tmpRestifyServer.get('/*',
					(pRequest, pResponse, fNext) =>
					{
						let tmpRequestURL = pRequest.url.split('?')[0];
						let tmpFilePath = libPath.join(tmpExamplesFolder, decodeURIComponent(tmpRequestURL));

						if (!tmpFilePath.startsWith(tmpExamplesFolder))
						{
							pResponse.writeHead(403);
							pResponse.end('Forbidden');
							return fNext(false);
						}

						if (libFS.existsSync(tmpFilePath) && libFS.statSync(tmpFilePath).isDirectory())
						{
							tmpFilePath = libPath.join(tmpFilePath, 'index.html');
						}

						if (!libFS.existsSync(tmpFilePath))
						{
							pResponse.writeHead(404);
							pResponse.end('Not Found');
							return fNext(false);
						}

						let tmpExtension = libPath.extname(tmpFilePath).toLowerCase();
						let tmpMimeType = this.getMimeType(tmpExtension);

						try
						{
							let tmpContent = libFS.readFileSync(tmpFilePath);
							pResponse.writeHead(200, { 'Content-Type': tmpMimeType });
							pResponse.end(tmpContent);
						}
						catch (pReadError)
						{
							pResponse.writeHead(500);
							pResponse.end('Internal Server Error');
						}
						return fNext(false);
					});

				this.log.info(`##############################################`);
				this.log.info(`  Example server running at http://localhost:${tmpPort}/`);
				this.log.info(`  Project: ${tmpProjectName}`);
				this.log.info(`  Bookstore API: http://localhost:${tmpPort}/1.0/`);
				this.log.info(`  Serving ${tmpExamples.length} example(s):`);
				for (let i = 0; i < tmpExamples.length; i++)
				{
					this.log.info(`    - ${tmpExamples[i].DisplayName}: http://localhost:${tmpPort}/${tmpExamples[i].RelativePath}`);
				}
				this.log.info(`##############################################`);
				this.log.info(`Press Ctrl+C to stop.`);

				// Keep the process running (don't call fCallback -- server is long-lived)
			});
	}
}

module.exports = QuackageExampleService;
