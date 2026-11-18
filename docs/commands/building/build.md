# build

Browserify and minify your module into a `dist/` folder using Gulp.

## Usage

```bash
quack build
```

## Behavior

The build command runs one or more Gulp-based build targets. By default, quackage defines two build executions:

### Build Targets

| Target | File Label | Browsers List | Output |
|--------|-----------|---------------|--------|
| Default | *(none)* | `since 2018` | `{name}.js` / `{name}.min.js` |
| Compatible | `compatible.` | `> 0.01%` | `{name}.compatible.js` / `{name}.compatible.min.js` |

### Build Steps (per target)

For each build target, the command:

1. Writes `.browserslistrc` -- sets the Browserslist query for this target. Backs up any existing file to `.browserslistrc-BACKUP`
2. Writes `.babelrc` -- creates a Babel config with `@babel/preset-env` and source maps (only if `.babelrc` doesn't already exist)
3. Writes `.gulpfile-quackage-config.json` -- the Gulp configuration with entry point, output folder and file names, resolved from your `package.json` `main` field
4. Writes `.gulpfile-quackage.js` -- the Gulp entry point that requires the quackage gulpfile
5. Runs Gulp -- executes the build using the generated gulpfile

### Build Configuration

The build reads configuration from `.quackage.json` (or the defaults). Key fields:

```json
{
  "GulpfileConfiguration": {
    "EntrypointInputSourceFile": "{CWD}/{package.main}",
    "LibraryObjectName": "{PascalCaseName}",
    "LibraryOutputFolder": "{CWD}/dist/",
    "LibraryUniminifiedFileName": "{name}.js",
    "LibraryMinifiedFileName": "{name}.min.js"
  }
}
```

### Exit Status

If Gulp exits non-zero for a build target, the build stops there and does not run any later targets. `quack build` then exits with Gulp's exit code, so a `build` or `prepublishOnly` script fails with it.

## Customization

To customize build targets, create a `.quackage.json` in your project root and override the `GulpExecutions` array:

```json
{
  "GulpExecutions": [
    {
      "Hash": "modern",
      "Name": "Modern browsers only",
      "BuildFileLabel": "",
      "BrowsersListRC": "last 2 versions"
    }
  ]
}
```

## Example

```bash
quack build
```

Output:

```
###############################[ BUILDING Default standard build. ]###############################
Quackage found gulp at ./node_modules/.bin/gulp ... executing build from there.
###############################[ BUILDING Default standard build. ]###############################
```
