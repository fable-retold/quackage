# run-mocha-tests

Run Mocha tests in TDD mode with the spec reporter.

## Usage

```bash
quack run-mocha-tests [options]
```

Aliases: `test`

## Options

| Option | Description |
|--------|-------------|
| `-g, --grep <expression>` | A grep search expression to filter which tests run |

## Behavior

1. Locates the Mocha binary using the standard executable resolution order (CWD, quackage package, git repo). If none of those has it, quack checks `node_modules/.bin` in each folder above CWD. That finds the Mocha a monorepo installs at its root.
2. Runs Mocha with:
   - `-u tdd` -- TDD interface (suite/test)
   - `-R spec` -- spec reporter
   - `--exit` -- force exit after tests complete
3. If `--grep` is provided, only tests matching the expression are executed

## Exit Status

`quack test` exits with Mocha's own exit code. That is `0` when every test passes, and otherwise the number of failed tests (Mocha caps it at 255). A module whose `test` or `prepublishOnly` script is `npx quack test` therefore stops `npm test` and `npm publish` when a test fails.

If Mocha is killed by a signal, quack exits with `128` plus the signal number (for example `143` for `SIGTERM`). If Mocha cannot be found or started, quack exits with `1`.

## Example

```bash
# Run all tests
quack test

# Run only tests matching "User"
quack test --grep User
```

This is equivalent to the standard npm script added by `updatepackage`:

```bash
npm test
# runs: npx mocha -u tdd -R spec
```
