/**
 * Quackage Release — npm + GHCR release pipeline helpers.
 *
 * Centralizes the release-pipeline shell logic that would otherwise be
 * duplicated across every dockerized retold module. Each module's
 * package.json `scripts` becomes a small block of `npx quack release …`
 * delegations:
 *
 *   "prepublishOnly":      "npm test",
 *   "postversion":         "npx quack release postversion",
 *   "postpublish":         "npx quack release postpublish",
 *   "release:patch":       "npx quack release patch",
 *   "release:patch:image": "npx quack release patch --image"
 *
 * Subcommands:
 *
 *   postversion   Push the bump commit (NOT the tag — the tag push is
 *                 gated by postpublish + BUILD_DOCKER so docker
 *                 rebuilds are deliberate).
 *
 *   postpublish   When BUILD_DOCKER=1 is set in the env: tag
 *                 v<package_version> (no-op if tag already exists)
 *                 and push the tag to origin (which fires the GHCR
 *                 workflow). When BUILD_DOCKER is unset: no-op. This
 *                 inversion makes docker an explicit, opt-in artifact
 *                 — most patch releases ship to npm only and skip the
 *                 multi-arch build cost.
 *
 *   publish       `npm publish` directly. With --image, sets
 *                 BUILD_DOCKER=1 in the env so postpublish fires.
 *
 *   patch | minor | major
 *                 One-shot release: `npm version <bump>` then
 *                 `npm publish`. With --image, the publish step gets
 *                 BUILD_DOCKER=1.
 *
 * Convention:
 *   Image tag is `v<package.json version>`. The GHCR workflow at
 *   `.github/workflows/publish-image.yml` triggers on `v*.*.*` tag
 *   pushes and builds + pushes to
 *   `ghcr.io/<owner>/<package-name>:<version>`.
 */

const libCommandLineCommand = require('pict-service-commandlineutility').ServiceCommandLineCommand;
const libChildProcess = require('child_process');

const VALID_SUBCOMMANDS = ['postversion', 'postpublish', 'publish', 'patch', 'minor', 'major'];

class QuackageCommandRelease extends libCommandLineCommand
{
	constructor(pFable, pManifest, pServiceHash)
	{
		super(pFable, pManifest, pServiceHash);

		this.options.CommandKeyword = 'release';
		this.options.Description = 'Release-pipeline helpers (postversion / postpublish hooks + one-shot release shortcuts).';

		this.options.CommandArguments.push({ Name: '<subcommand>', Description: 'postversion | postpublish | publish | patch | minor | major' });

		this.options.CommandOptions.push({ Name: '--image', Description: 'Include the GHCR docker image build (sets BUILD_DOCKER=1).', Default: false });

		this.addCommand();
	}

	onRunAsync(fCallback)
	{
		let tmpSub = (this.ArgumentString || '').trim();
		let tmpWithImage = !!this.CommandOptions.image;

		if (VALID_SUBCOMMANDS.indexOf(tmpSub) < 0)
		{
			this.log.error(`Unknown release subcommand: [${tmpSub || '(none)'}]. Expected one of: ${VALID_SUBCOMMANDS.join(', ')}.`);
			return fCallback(new Error('Unknown release subcommand'));
		}

		switch (tmpSub)
		{
			case 'postversion':
				return this._runPostversion(fCallback);
			case 'postpublish':
				return this._runPostpublish(fCallback);
			case 'publish':
				return this._runPublish(tmpWithImage, fCallback);
			case 'patch':
			case 'minor':
			case 'major':
				return this._runVersion(tmpSub, tmpWithImage, fCallback);
		}
	}

	// ── Hook implementations ──────────────────────────────────────────

	_runPostversion(fCallback)
	{
		// Push the bump commit only. The local tag npm version created
		// stays local; postpublish (gated by BUILD_DOCKER) is the only
		// thing that pushes tags to remote.
		return this._spawn('git', ['push'], fCallback);
	}

	_runPostpublish(fCallback)
	{
		if (process.env.BUILD_DOCKER !== '1')
		{
			this.log.info('postpublish: BUILD_DOCKER unset — skipping docker tag/push.');
			return fCallback();
		}

		let tmpVersion = this.fable.AppData.Package && this.fable.AppData.Package.version;
		if (!tmpVersion)
		{
			this.log.error('postpublish: cannot read package version from AppData.Package.version');
			return fCallback(new Error('No package version'));
		}
		let tmpTag = 'v' + tmpVersion;

		// Idempotent tag — fails silently if it already exists.
		let tmpTagResult = libChildProcess.spawnSync('git', ['tag', tmpTag],
			{ stdio: ['ignore', 'pipe', 'pipe'] });
		if (tmpTagResult.status === 0)
		{
			this.log.info(`postpublish: created git tag ${tmpTag}.`);
		}
		else
		{
			this.log.info(`postpublish: git tag ${tmpTag} already exists locally — pushing existing.`);
		}

		// Push the tag. If already on remote, push is a no-op; we
		// swallow any non-zero exit to keep the npm publish flow
		// from looking failed.
		let tmpPushResult = libChildProcess.spawnSync('git', ['push', 'origin', tmpTag],
			{ stdio: ['ignore', 'pipe', 'pipe'] });
		if (tmpPushResult.status === 0)
		{
			this.log.info(`postpublish: pushed git tag ${tmpTag} to origin → GHCR build will start.`);
		}
		else
		{
			this.log.warn(`postpublish: git push origin ${tmpTag} returned non-zero (likely already on remote); continuing.`);
		}
		return fCallback();
	}

	// ── User-invoked subcommands ──────────────────────────────────────

	_runPublish(pWithImage, fCallback)
	{
		let tmpEnv = Object.assign({}, process.env);
		if (pWithImage)
		{
			tmpEnv.BUILD_DOCKER = '1';
			this.log.info('release publish --image: BUILD_DOCKER=1 will trigger postpublish to push the version tag.');
		}
		else
		{
			this.log.info('release publish: npm only (no docker rebuild).');
		}
		let tmpResult = libChildProcess.spawnSync('npm', ['publish'],
			{ stdio: 'inherit', env: tmpEnv });
		return fCallback(tmpResult.status === 0
			? null
			: new Error(`npm publish exited ${tmpResult.status}`));
	}

	_runVersion(pBump, pWithImage, fCallback)
	{
		// `npm version <bump>` bumps + commits + creates LOCAL tag.
		// Module's `postversion` hook should call
		// `npx quack release postversion`, which pushes the commit
		// only.
		let tmpBumpResult = libChildProcess.spawnSync('npm', ['version', pBump],
			{ stdio: 'inherit' });
		if (tmpBumpResult.status !== 0)
		{
			return fCallback(new Error(`npm version ${pBump} exited ${tmpBumpResult.status}`));
		}

		// Then publish, optionally with docker.
		return this._runPublish(pWithImage, fCallback);
	}

	// ── Helpers ───────────────────────────────────────────────────────

	_spawn(pCmd, pArgs, fCallback)
	{
		let tmpResult = libChildProcess.spawnSync(pCmd, pArgs, { stdio: 'inherit' });
		return fCallback(tmpResult.status === 0
			? null
			: new Error(`${pCmd} ${pArgs.join(' ')} exited ${tmpResult.status}`));
	}
}

module.exports = QuackageCommandRelease;
