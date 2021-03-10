/**
 * This file only purpose is to copy files before npm publish and strip churn/security sensitive metadata from package.json
 *
 * **NOTE:**
 * 👉 This file should not use any 3rd party dependency
 */
const { writeFileSync, copyFileSync, statSync, readFileSync } = require('fs');
const { resolve, basename } = require('path');
const packageJson = require('../package.json');

const findUp = require('find-up');

const configPath = findUp.sync(['.publish-config-rc', '.publish-config-rc.json']);
const optionalPublishConfig = configPath ? JSON.parse(readFileSync(configPath, 'utf-8')) : {};

main();

function main() {
  const projectRoot = resolve(__dirname, '..');
  const buildPath = resolve(projectRoot, 'build');
  const buildPackageJson = createBuildPackageJson(packageJson);

  const cpFiles = ['README.md', 'LICENSE'].map((file) => resolve(projectRoot, file));

  cp(cpFiles, buildPath);

  writeFileSync(resolve(buildPath, 'package.json'), buildPackageJson);

  const distPath = resolve(projectRoot, 'dist');
  const distPackageJson = createDistPackageJson(packageJson);

  cp(cpFiles, distPath);

  writeFileSync(resolve(distPath, 'package.json'), distPackageJson);
}

/**
 *
 * @param {string[]|string} source
 * @param {string} target
 */
function cp(source, target) {
  const isDir = statSync(target).isDirectory();

  if (isDir) {
    if (!Array.isArray(source)) {
      throw new Error('if <target> is directory you need to provide source as an array');
    }

    source.forEach((file) => copyFileSync(file, resolve(target, basename(file))));

    return;
  }

  copyFileSync(/** @type {string} */ (source), target);
}

/**
 * @param {any} packageConfig
 * @return {string}
 */
function createBuildPackageJson(packageConfig) {
  const { devDependencies, scripts, engines, config, 'lint-staged': lintStaged, ...distPackageJson } = packageConfig;

  if (optionalPublishConfig && optionalPublishConfig.publishConfig) {
    distPackageJson.publishConfig = optionalPublishConfig.publishConfig;
  }

  delete distPackageJson.ava;
  delete distPackageJson.nyc;
  delete distPackageJson.prettier;

  return JSON.stringify(distPackageJson, null, 2);
}

/**
 * @param {any} packageConfig
 * @return {string}
 */
function createDistPackageJson(packageConfig) {
  const { devDependencies, scripts, engines, config, 'lint-staged': lintStaged, ...distPackageJson } = packageConfig;

  if (optionalPublishConfig && optionalPublishConfig.publishConfig) {
    distPackageJson.publishConfig = optionalPublishConfig.publishConfig;
  }

  delete distPackageJson.ava;
  delete distPackageJson.nyc;
  delete distPackageJson.prettier;
  delete distPackageJson.peerDependencies;
  delete distPackageJson.typings;
  delete distPackageJson.module;

  distPackageJson.name = "@cubism-ts/bundle";
  distPackageJson.description = "Cubism TS API standalone browser bundle";
  distPackageJson.main = "cubism-ts.bundle.js";
  distPackageJson.files = [
    "cubism-ts.bundle.js",
    "CHANGELOG.md",
    "LICENSE",
    "README.md"
  ];

  return JSON.stringify(distPackageJson, null, 2);
}
