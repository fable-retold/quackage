# Quackage

> **[&#9654; Read the Quackage Documentation](https://fable-retold.github.io/quackage/)** &mdash; interactive docs with the full API reference.

Package.  Test.  Duck.  Name a more iconic trio.

Who doesn't love managing configuration and tooling?  I can tell you who doesn't love it.  I don't love it.

This standardizes:

1. Building an app for a browser
2. Transpiling an app for ... older browsers
3. Running unit tests
4. Copying files around
5. Managing package.json files in a standard way
6. Assembling folders of JSON views into view classes
7. Boilerplate files and file structures
8. Pulling documentation from codebases
9. Compiling data description language files into their downstream parts (manifests, sql generation, documentation, etc.)

## Usage

First you need to install the thing.  The easy way is npm or whatever you use to get your packages, which installs the package and puts a couple commands in your node_modules/.bin folder.  You run it either with `quack` or `qua` for short.

```shell
npm install --save-dev quackage
```

Second, quack like a duck.  

### For instance, you can check your dependencies:

```shell
npx quack check-dependencies
```


### You can build the app

```shell
npx quack build
```

### You can test

```shell
npx quack test
```

## If you hate this, you can always inject commands into your `package.json` file:

```shell
npx quack updatepackage
```

## Related Packages

- [indoctrinate](https://github.com/fable-retold/indoctrinate) - Documentation scaffolding

## License

MIT

## Contributing

Pull requests are welcome. For details on our code of conduct, contribution process, and testing requirements, see the [Retold Contributing Guide](https://github.com/stevenvelozo/retold/blob/main/docs/contributing.md).
