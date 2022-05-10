"use strict";
const path = require('path');
const pkgDir = require('pkg-dir').sync;
const pathExists = require('path-exists').sync
// const userHome = require('user-home');
const npmInstall = require('npminstall');
const { getDefaultRegistry, getNpmLatestVersion } = require('@chen-cli-dev/get-npm-info')

const { isObject } = require("@chen-cli-dev/util");
const formatPath = require("@chen-cli-dev/format-path");

class Package {
  constructor(options) {
    if (!options || !isObject(options)) {
      throw new Error("option 对象为空");
    }
    // package 的目标路径
    this.targetPath = options.targetPath;
    // 缓存路径
    this.storePath = options.storePath;
    // pkg name
    this.packageName = options.packageName;
    // pkg version
    this.packageVersion = options.packageVersion;
    // package的缓存目录前缀
    this.cacheFilePathPrefix = this.packageName.replace("/", "_");
  }

  async prepare() {
    if (this.packageVersion === "latest") {
      this.packageVersion = await getNpmLatestVersion(this.packageName);
    }
  }

  /*
	目标路径：_@imooc-cli_init@1.1.2@@imooc-cli/
	现有参数：@imooc-cli/init(this.packageName)、版本
	*/
  get cacheFilePath() {
    return path.resolve(
      this.storePath,
      `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`
    );
  }

  getSpecificCacheFilePath(packageVersion) {
    return path.resolve(
      this.storePath,
      `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`
    );
  }

  // 判断当前 Package 是否存在
  async exists() {
    if (this.storePath) {
      await this.prepare();
      return pathExists(this.cacheFilePath);
    } else {
      return pathExists(this.targetPath);
    }
  }

  // 安装 Package
  async install() {
    await this.prepare();
    return npmInstall({
      root: this.targetPath,
      pkgs: [{ name: this.packageName, version: this.packageVersion }],
      registry: getDefaultRegistry(),
      storeDir: this.storePath,
    });
  }

  // 更新 Package
  async update() {
    await this.prepare();
    // 1. 获取最新的npm模块版本号
    const latestPackageVersion = await getNpmLatestVersion(this.packageName);
    // 2. 查询最新版本号对应的路径是否存在
    const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion);
    // 3. 如果不存在，则直接安装最新版本
    if (!pathExists(latestFilePath)) {
      await npminstall({
        root: this.targetPath,
        storeDir: this.storeDir,
        registry: getDefaultRegistry(),
        pkgs: [
          {
            name: this.packageName,
            version: latestPackageVersion,
          },
        ],
      });
      this.packageVersion = latestPackageVersion;
    } else {
      this.packageVersion = latestPackageVersion;
    }
  }

  // 获取入口文件的路径
  getRootFilePath() {
    function _getRootFile(targetPath) {
      // 1. 获取 package.json 所在目录 - pkg-dir
      // console.log(this.targetPath)
      const dir = pkgDir(targetPath);
      if (dir) {
        // 2. 读取 package.json
        const pkgFile = require(path.resolve(dir, "package.json"));
        // console.log(pkgFile);
        if (pkgFile?.main) {
          // 3. 寻找 main/lib
          // 4.路径兼容（window / MacOS）
          return formatPath(path.resolve(dir, pkgFile.main));
        }
      }
      return null;
    }

		if (this.storePath) {
			return _getRootFile(this.cacheFilePath);
		} else {
			return _getRootFile(this.targetPath);
		}
  }
}

module.exports = Package;
