# prepare-docs

All-in-one documentation preparation. Generates the catalog, builds the keyword search index and injects pict-docuserve assets in a single command.

## Usage

```bash
quack prepare-docs [docs_folder] [options]
```

Aliases: `docs`, `prep-docs`

## Arguments

| Argument | Default | Description |
|----------|---------|-------------|
| `docs_folder` | `./docs` | The documentation folder to prepare |

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `-d, --directory_root <path>` | CWD | Root directory to scan for modules |
| `-b, --branch <branch>` | `master` | Git branch for GitHub raw URLs |
| `-g, --github_org <org>` | `stevenvelozo` | GitHub organization for raw URLs |

## Behavior

Runs three steps in sequence:

### Step 1: Indoctrinate Catalog

Runs `indoctrinate generate_catalog` to scan the module directory tree and produce `retold-catalog.json` in the docs folder.

### Step 2: Keyword Index

Runs `indoctrinate generate_keyword_index` to produce `retold-keyword-index.json` in the docs folder.

### Step 3: Docuserve Inject

Runs `pict-docuserve inject` to copy the web application assets into the docs folder.

### Final

Writes a `.nojekyll` file for GitHub Pages compatibility.

### Exit Status

If the catalog, keyword index or inject step exits non-zero, preparation stops there. `quack prepare-docs` then exits with that step's exit code.

Before those steps, prepare-docs also runs `pict-docuserve stage-examples` and `pict-docuserve stage-playground`. These are optional. If one fails, it logs a warning and preparation carries on. This also covers a pict-docuserve that is too old to have those subcommands.

## Example

```bash
# Prepare docs with defaults (./docs folder, scan CWD)
quack prepare-docs

# Specify folder and module root
quack prepare-docs ./docs -d ./modules

# Use a different branch and org
quack docs ./docs -d ./modules -b develop -g myorg
```

This is equivalent to the standard npm script added by `updatepackage`:

```bash
npm run docs
# runs: npx quack prepare-docs ./docs -d ./modules
```
