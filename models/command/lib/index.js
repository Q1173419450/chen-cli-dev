"use strict";
const semver = require("semver");
const colors = require("colors/safe");
const log = require("@chen-cli-dev/log")

const LAST_NODE_VERSION = '13.0.0';

class Command {
  constructor(argv) {
    this._argv = argv;
    if (!argv) {
      throw new Error('参数不能为空')
    }
    if (!Array.isArray(argv)) {
      throw new Error('参数必须为数组')
    }
    if (argv.length === 0) {
      throw new Error('参数列表不能为空')
    }
    let running = new Promise((resolve, reject) => {
      let chain = Promise.resolve();
      /* 检验 node 版本  */
      chain
        .then(() => this.checkNodeVersion())
        .then(() => this.initArgs())
        .then(() => this.init())
        .then(() => this.exec())
        .catch((err) => {
          log.error(err.message);
        })
    })
  }

  initArgs() {
    this._cmd = this._argv[this._argv.length - 1];
    this._argv = this._argv.slice(0, this._argv.length - 1);
  }

  init() {
    throw new Error('init 方法子类必须实现')
  }

  exec() {
    throw new Error('exec 方法子类必须实现')

  }

  checkNodeVersion() {
    // console.log(process.version, constant.LAST_NODE_VERSION);
    if (semver.lt(process.version, LAST_NODE_VERSION)) {
      throw new Error(
        colors.red(
          `chen-cli-dev 需要安装 v${LAST_NODE_VERSION} 以上版本的 Node.js`
        )
      );
    }
  }
}

module.exports = Command;
