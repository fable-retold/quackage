# Changelog

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
