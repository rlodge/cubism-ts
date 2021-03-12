# cubism-ts

cubism-ts is an ES6 module of [cubism](https://github.com/square/cubism), based on D3V5 and Typescript.  It
provides embedded typings for TS projects.


## Versions:

Version | D3 Version
--- | ---
**5.x** | ^5.15.0

## Usage:

1. ES6 Usage or Typescript usage:

```
npm install @cubism-ts/library --save
import { cubism } from '@cubism-ts/library';
```

Please note adding `cubism-ts` does _not_ add `d3` or other required packages; they are peer dependencies only.
Check this module's `package.json` to find the list of required packages and versions.

2. Standalone Usage

See the `examples` directory for various sample usages.  Basically, you need this:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/5.16.0/d3.js"
        charset="utf-8"></script>
<script src="lib/cubism-ts.bundle.js"
        charset="utf-8"></script>
```

## Demo
To see this library in action, clone this repository and run:

```bash
npm install
npm run build
npm start
```

Then point your browser [here](http://localhost:5000).

## Development

You probably know how to build, run, and test npm-based projects.  Scripts on this one are based on
[typescript-starter](https://github.com/bitjson/typescript-starter), so you can follow the README there.

Note that as of this writing, there are not really any tests in this project, so some functionality might not work.
(And if someone wants to _write_ tests, let me know.)

## Documentation

For more information, please visit square/cubism's [home page](http://square.github.io/cubism/) and [wiki](https://github.com/square/cubism/wiki)

## Limitation

Graphite, Cube and GangliaWeb have not been verified yet.

## Credits

Contributors of the original [cubism](https://github.com/square/cubism).

Contributors of [typescript-starter](https://github.com/bitjson/typescript-starter) on which the build is based.

Contributors of [cubism-es](https://github.com/BigFatDog/cubism-es) on which the typescript code is based.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
