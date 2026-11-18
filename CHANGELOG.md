# Changelog

## Unreleased

### Fixed

- **`quack` now exits non-zero when the process it runs fails.**
  Previously the process runner never read the child's exit code and
  always reported "Process completed successfully with a quack!", so
  `npx quack test` exited 0 even when Mocha reported failures. That
  meant `test` and `prepublishOnly` scripts built on it could not stop
  a publish. Now:
  - A child that exits non-zero or is killed by a signal makes the
    command fail.
  - `quack` exits with the child's own code: the number of failed
    tests for Mocha, or 128 + the signal number.
  - The runner waits for stdout and stderr to finish writing before
    it exits, so piped output is not cut short.
  This covers `test`, `build`, `copy`, coverage and the docs commands.
- **A command that fails before it runs anything now exits 1.**
  Examples are "mocha not found", "gulp not found" and "docs folder
  not found". Before, the error was lost: a command phase that calls
  back straight away finishes before the command registers its
  `wait()`, and fable's Anticipate drops an error that arrives with no
  waiter. quackage now hands each phase's result back on the next
  event-loop turn, so `quack` exits 1 with the error message.
- `quack test` now also looks for Mocha in `node_modules/.bin` in each
  folder above CWD. A module in a monorepo with Mocha installed only
  at the root (such as quackage in retold) now runs its suite. Before,
  it reported success without running any tests.
- `quack examples-build` still builds every example when one fails.
  It now reports the failed examples and exits non-zero, instead of
  logging "All examples built successfully!". `quack examples` still
  serves whatever did build.
- `quack prepare-docs` treats `stage-examples` / `stage-playground`
  as optional. They log a warning on failure, including on an older
  pict-docuserve that lacks them, and preparation continues.

## 1.2.0

### Added

- **`quack release` command** — release-pipeline helpers used as npm
  script hooks and one-shot release shortcuts. Centralizes the
  postversion / postpublish git-tag-and-push logic that would otherwise
  be duplicated across every dockerized module's `package.json`.
  Subcommands: `postversion`, `postpublish`, `publish`, `patch`,
  `minor`, `major`. The `--image` flag opts the release into rebuilding
  the GHCR image (sets `BUILD_DOCKER=1` for `npm publish`, which makes
  the `postpublish` hook tag-and-push the version).
- **`quack docker-init` command** — scaffolds the GHCR publish pipeline
  for a module: creates `.github/workflows/publish-image.yml`,
  `BUILDING-AND-PUBLISHING.md`, and idempotently patches the standard
  release scripts into `package.json`. Flags: `--shape service|job`
  (controls the lifecycle note in the doc; default `service`),
  `--force` (overwrite existing scaffolded files). Deliberately does
  not generate a Dockerfile — that's per-module.

### Convention introduced

`BUILD_DOCKER=1` env-var opt-in for triggering the GHCR build during
`npm publish`. With the var unset (the new default), `npm publish`
ships to npm only and skips the multi-arch docker rebuild. With it
set, `postpublish` tags the version and pushes the tag, which fires
the GHCR workflow. Lets module maintainers be deliberate about when
they spend the multi-minute build cost vs. shipping a doc-only or
internal-only patch.
