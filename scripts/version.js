var appRoot = require('app-root-path')
const { gitDescribeSync } = require('git-describe')
const { version } = require(appRoot.path + '/package.json')
const { resolve, relative } = require('path')
const fs = require('fs')
const { writeFileSync } = require('fs-extra')

const gitInfo = gitDescribeSync({
  dirtyMark: false,
  dirtySemver: false,
})

gitInfo.version = version

const srcDir = resolve(appRoot.path, 'src')
if (!fs.existsSync(srcDir)) {
  fs.mkdirSync(srcDir)
}

const libDir = resolve(srcDir, 'lib')
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir)
}

const file = resolve(libDir, 'version.ts')
writeFileSync(
  file,
  `// IMPORTANT: THIS FILE IS AUTO GENERATED! DO NOT MANUALLY EDIT OR CHECKIN!
/* tslint:disable */
export const VERSION: { readonly version: string; [s: string]: any; } = ${JSON.stringify(
    gitInfo,
    null,
    4
  )};
/* tslint:enable */
`,
  { encoding: 'utf-8' }
)

console.log(
  `Wrote version info ${gitInfo.raw} to ${relative(
    resolve(__dirname, '..'),
    file
  )}`
)
