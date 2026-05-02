/**
 * Quackage docker-init — scaffold the GHCR publish pipeline for a module.
 *
 * Generates the bits that are byte-identical across modules (or only
 * differ in straightforward substitutions):
 *   - .github/workflows/publish-image.yml   (image name from package.json)
 *   - BUILDING-AND-PUBLISHING.md            (with module-specific notes)
 *   - the release scripts in package.json   (idempotent, only adds if missing)
 *
 * Deliberately does NOT generate a Dockerfile — that's per-module
 * (entry point, port, build steps, healthcheck) and writing a generic
 * one would just be a thing that gets thrown away.
 *
 * Usage:
 *   npx quack docker-init                Scaffold for the current module
 *   npx quack docker-init --force        Overwrite existing scaffolded files
 *   npx quack docker-init --shape job    Mark as one-shot job (no healthcheck
 *                                        guidance in the doc); default is
 *                                        long-running service shape
 */

const libCommandLineCommand = require('pict-service-commandlineutility').ServiceCommandLineCommand;
const libFs = require('fs');
const libPath = require('path');

const VALID_SHAPES = ['service', 'job'];

class QuackageCommandDockerInit extends libCommandLineCommand
{
	constructor(pFable, pManifest, pServiceHash)
	{
		super(pFable, pManifest, pServiceHash);

		this.options.CommandKeyword = 'docker-init';
		this.options.Description = 'Scaffold the GHCR publish pipeline (workflow + docs + release scripts) for the current module.';

		this.options.CommandOptions.push({ Name: '--shape [shape]', Description: 'Lifecycle shape for the doc (service | job). Default: service.', Default: 'service' });
		this.options.CommandOptions.push({ Name: '--force', Description: 'Overwrite existing scaffolded files.', Default: false });

		this.addCommand();
	}

	onRunAsync(fCallback)
	{
		let tmpShape = String(this.CommandOptions.shape || 'service').toLowerCase();
		let tmpForce = !!this.CommandOptions.force;

		if (VALID_SHAPES.indexOf(tmpShape) < 0)
		{
			this.log.error(`Invalid --shape [${tmpShape}]; expected one of: ${VALID_SHAPES.join(', ')}.`);
			return fCallback(new Error('Invalid shape'));
		}

		let tmpPkg = this.fable.AppData.Package;
		let tmpCWD = this.fable.AppData.CWD;
		if (!tmpPkg || !tmpPkg.name)
		{
			this.log.error('docker-init: no package.json with a `name` field in the current directory.');
			return fCallback(new Error('No package'));
		}

		let tmpImageName = tmpPkg.name;
		let tmpOwner = this._inferGithubOwner(tmpPkg) || 'stevenvelozo';
		let tmpVersion = tmpPkg.version || '0.0.0';

		let tmpSubstitutions =
			{
				PackageName:  tmpImageName,
				Owner:        tmpOwner,
				Version:      tmpVersion,
				Shape:        tmpShape
			};

		this.log.info(`docker-init: scaffolding for ${tmpImageName} (shape=${tmpShape}, owner=${tmpOwner})`);

		let tmpResults = [];

		// 1. .github/workflows/publish-image.yml
		let tmpWorkflowPath = libPath.join(tmpCWD, '.github', 'workflows', 'publish-image.yml');
		tmpResults.push(this._writeFile(tmpWorkflowPath, this._renderWorkflow(tmpSubstitutions), tmpForce));

		// 2. BUILDING-AND-PUBLISHING.md
		let tmpDocPath = libPath.join(tmpCWD, 'BUILDING-AND-PUBLISHING.md');
		tmpResults.push(this._writeFile(tmpDocPath, this._renderDoc(tmpSubstitutions), tmpForce));

		// 3. package.json release scripts (idempotent)
		let tmpPackagePath = libPath.join(tmpCWD, 'package.json');
		tmpResults.push(this._patchPackageJson(tmpPackagePath, tmpForce));

		this.log.info('');
		this.log.info('docker-init: results:');
		for (let i = 0; i < tmpResults.length; i++)
		{
			this.log.info(`  ${tmpResults[i]}`);
		}
		this.log.info('');
		this.log.info('Next steps:');
		this.log.info(`  1. Write or audit a Dockerfile in this module's root.`);
		this.log.info(`  2. Set GHCR package visibility to public after first push:`);
		this.log.info(`       https://github.com/${tmpOwner}/${tmpImageName}/pkgs/container/${tmpImageName}`);
		this.log.info(`  3. Read BUILDING-AND-PUBLISHING.md for the release flow.`);

		return fCallback();
	}

	// ── File ops ────────────────────────────────────────────────────

	_writeFile(pPath, pContent, pForce)
	{
		let tmpExists = false;
		try { tmpExists = libFs.statSync(pPath).isFile(); }
		catch (pErr) { /* doesn't exist, fine */ }

		if (tmpExists && !pForce)
		{
			return `[skip]  ${pPath} (exists; pass --force to overwrite)`;
		}
		try
		{
			libFs.mkdirSync(libPath.dirname(pPath), { recursive: true });
			libFs.writeFileSync(pPath, pContent);
			return `[${tmpExists ? 'overwrite' : 'create'}] ${pPath}`;
		}
		catch (pErr)
		{
			return `[error] ${pPath}: ${pErr.message}`;
		}
	}

	_patchPackageJson(pPath, pForce)
	{
		let tmpPkg;
		try { tmpPkg = JSON.parse(libFs.readFileSync(pPath, 'utf8')); }
		catch (pErr) { return `[error] ${pPath}: ${pErr.message}`; }

		if (!tmpPkg.scripts) { tmpPkg.scripts = {}; }

		let tmpDesired =
			{
				prepublishOnly:        'npm test',
				postversion:           'npx quack release postversion',
				postpublish:           'npx quack release postpublish',
				'publish:docker':      'npx quack release publish --image',
				'release:patch':       'npx quack release patch',
				'release:minor':       'npx quack release minor',
				'release:major':       'npx quack release major',
				'release:patch:image': 'npx quack release patch --image',
				'release:minor:image': 'npx quack release minor --image',
				'release:major:image': 'npx quack release major --image'
			};

		let tmpAdded = [];
		let tmpSkipped = [];
		let tmpKeys = Object.keys(tmpDesired);
		for (let i = 0; i < tmpKeys.length; i++)
		{
			let tmpK = tmpKeys[i];
			if (tmpPkg.scripts.hasOwnProperty(tmpK) && !pForce)
			{
				tmpSkipped.push(tmpK);
				continue;
			}
			tmpPkg.scripts[tmpK] = tmpDesired[tmpK];
			tmpAdded.push(tmpK);
		}

		if (tmpAdded.length === 0)
		{
			return `[skip]  ${pPath} (all scripts already present; pass --force to overwrite)`;
		}

		// Detect existing indentation (tabs vs 4-space) so we don't
		// reformat the file gratuitously.
		let tmpRaw = libFs.readFileSync(pPath, 'utf8');
		let tmpIndent = (tmpRaw.indexOf('\n\t') >= 0) ? '\t' : '    ';
		try { libFs.writeFileSync(pPath, JSON.stringify(tmpPkg, null, tmpIndent) + '\n'); }
		catch (pErr) { return `[error] ${pPath}: ${pErr.message}`; }
		return `[patch] ${pPath} (added: ${tmpAdded.join(', ')}; kept: ${tmpSkipped.join(', ') || 'none'})`;
	}

	// ── Helpers ─────────────────────────────────────────────────────

	_inferGithubOwner(pPkg)
	{
		let tmpRepo = pPkg.repository;
		if (!tmpRepo) return null;
		let tmpUrl = (typeof tmpRepo === 'string') ? tmpRepo : tmpRepo.url;
		if (!tmpUrl) return null;
		// Match github.com/<owner>/... in either https or ssh form.
		let tmpMatch = tmpUrl.match(/github\.com[:/]+([^/]+)\//);
		return tmpMatch ? tmpMatch[1] : null;
	}

	// ── Templates ───────────────────────────────────────────────────

	_renderWorkflow(pSubs)
	{
		return `# Publish a container image to GitHub Container Registry on every
# version tag push (e.g. \`v1.2.3\`). Generated by \`quack docker-init\`.
#
# Image lands at:
#   ghcr.io/${pSubs.Owner}/${pSubs.PackageName}:<version>
#   ghcr.io/${pSubs.Owner}/${pSubs.PackageName}:latest   (only on stable tags)

name: Publish container image

on:
  push:
    tags:
      - 'v*.*.*'
  workflow_dispatch:
    inputs:
      tag:
        description: 'Tag to apply (e.g. dev or 1.2.3-test). \`latest\` is reserved for stable tag pushes.'
        required: true
        default: 'dev'

permissions:
  contents: read
  packages: write

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up QEMU (multi-arch support)
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - name: Compute image tags
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/\${{ github.repository_owner }}/${pSubs.PackageName}
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=semver,pattern={{major}}
            type=raw,value=\${{ github.event.inputs.tag }},enable=\${{ github.event_name == 'workflow_dispatch' }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          platforms: linux/amd64,linux/arm64
          push: true
          tags: \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
`;
	}

	_renderDoc(pSubs)
	{
		let tmpShapeNote = (pSubs.Shape === 'job')
			? `\`${pSubs.PackageName}\` is a **one-shot job** rather than a long-running service: the container runs to completion and exits. Restart policy in compose / k8s should be \`no\` or \`OnFailure\`. The Dockerfile should NOT declare a HEALTHCHECK; compose / k8s evaluate success via the exit code.`
			: `\`${pSubs.PackageName}\` is a **long-running service**. Restart policy in compose / k8s should be \`unless-stopped\` (or equivalent). The Dockerfile should declare a HEALTHCHECK against the service's health endpoint.`;

		return `# Building and Publishing

How to ship \`${pSubs.PackageName}\` to npm and to GitHub Container Registry
(GHCR). Generated by \`quack docker-init\`; the structure matches the
shared template across all dockerized retold tools.

${tmpShapeNote}

---

## TL;DR

\`\`\`bash
# npm-only release (the default — most common case)
npm run release:patch

# npm release that ALSO rebuilds the GHCR image
npm run release:patch:image
\`\`\`

The default release is npm-only. Docker images are deliberate, opt-in
artifacts because each multi-arch build burns several minutes of CI
time. Use \`:image\` (or set \`BUILD_DOCKER=1\`) when runtime code,
dependencies, env-var contract, or the Dockerfile changed.

---

## Prerequisites (one-time setup)

- **npm login** — \`npm whoami\` should print your username.
- **Git remote configured** — \`git remote get-url origin\` should print
  \`git@github.com:${pSubs.Owner}/${pSubs.PackageName}.git\` (or the
  HTTPS equivalent).
- **Push access to the repo** — required so \`postversion\` /
  \`postpublish\` hooks can push commits and tags.
- **Docker** (only if you want to test the image locally before tag).

---

## Ecosystem convention: lockfiles are gitignored

\`package-lock.json\` is in this repo's \`.gitignore\` (Quackage convention
shared across the retold ecosystem). The Dockerfile must use \`npm install\`,
not \`npm ci\` — \`npm ci\` requires the lockfile to be in the build context
and CI runners only check out what's in git. If you see EUSAGE errors in
GHCR build logs, change \`RUN npm ci\` to \`RUN npm install\` in the
Dockerfile.

---

## Releasing

| Command                              | npm registry | GHCR image rebuild |
|--------------------------------------|--------------|--------------------|
| \`npm run release:patch\`              | yes          | no                 |
| \`npm run release:patch:image\`        | yes          | yes                |
| \`npm run release:minor\`              | yes          | no                 |
| \`npm run release:minor:image\`        | yes          | yes                |
| \`npm run release:major\`              | yes          | no                 |
| \`npm run release:major:image\`        | yes          | yes                |

The non-\`:image\` variants are the default because most patch releases
don't change runtime behavior. The \`:image\` variants tell the pipeline
"this release does change runtime — build me a new image."

### Direct CLI (also works)

\`\`\`bash
npm publish                              # npm only
npm run publish:docker                   # npm + docker (sets BUILD_DOCKER=1)
\`\`\`

### From \`retold-manager\` TUI

- \`[!]\` Publish — npm only
- \`[D]\` Publish with docker image — npm + GHCR build

### Promoting a previous npm release to docker later

If you released \`v<x>\` to npm only, then later decide you do want a
docker image:

\`\`\`bash
git push origin v<x>    # pushes the local tag → GHCR fires
\`\`\`

The local tag is still sitting there from the original \`npm version\`
step. Pushing it triggers the workflow without touching npm.

---

## The chain

The lifecycle hooks all live in \`package.json\` and delegate to
\`npx quack release …\`. Default path (\`BUILD_DOCKER\` unset):

\`\`\`
npm publish
  → prepublishOnly: npm test                     ← test gate
  → publish to npm
  → postpublish: BUILD_DOCKER unset → no-op      ← image NOT triggered
\`\`\`

Docker-included path (\`BUILD_DOCKER=1\`):

\`\`\`
BUILD_DOCKER=1 npm publish    (or: npm run publish:docker)
  → prepublishOnly: npm test
  → publish to npm
  → postpublish: BUILD_DOCKER=1 → tag + push     ← image trigger
  → .github/workflows/publish-image.yml fires
  → docker buildx build linux/amd64,linux/arm64
  → docker push ghcr.io/${pSubs.Owner}/${pSubs.PackageName}:<version>
\`\`\`

---

## Verifying a release

1. **npm**: \`npm view ${pSubs.PackageName} version\`
2. **Workflow**: \`https://github.com/${pSubs.Owner}/${pSubs.PackageName}/actions\`
3. **Image**: \`docker pull ghcr.io/${pSubs.Owner}/${pSubs.PackageName}:latest\`

If the first \`docker pull\` returns \`denied\`, the package is private by
default — flip visibility to public via Package Settings → Danger Zone
on the package page.

---

## Image consumption

\`\`\`bash
docker pull ghcr.io/${pSubs.Owner}/${pSubs.PackageName}:latest
docker run --rm ghcr.io/${pSubs.Owner}/${pSubs.PackageName}:latest
\`\`\`

Configuration via env vars: see this module's README for the supported
\`<MODULE>_*\` variables. Any secret-bearing var also accepts \`<NAME>_FILE\`
pointing at a file whose contents become the value (mysql/postgres
convention; works with docker secrets and k8s Secrets).
`;
	}
}

module.exports = QuackageCommandDockerInit;
