"use strict";

const path = require("path");
/*
    require 支持三种文件类型：.js/.json/.node 文件
    .js => module.exports/exports
    .json => JSON.parse
    其他文件类型默认使用 .js 类型去解析
*/
const pkg = require("../package.json");
const log = require("@chen-cli-dev/log");
const init = require("@chen-cli-dev/init");
const exec = require("@chen-cli-dev/exec");
const constant = require("./const");
// const semver = require("semver");
const colors = require("colors/safe");
const userHome = require("user-home");
const pathExists = require("path-exists").sync;
const commander = require("commander");
const program = new commander.Command();

module.exports = core;

async function core() {
  try {
    await prepare()
    console.log("-------- init ----------");
    registerCommand();
  } catch (error) {
    log.error(error.message);
  }
}

async function prepare() {
  checkVersion();
  // checkNodeVersion();
  // checkRoot();
  checkUserHome();
  // checkInputArgs();
  checkEnv();
  /* 检测版本 未做 */
}

function registerCommand() {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage("<command> [options]")
    .version(pkg.version)
    .option("-d, --debug", "是否开启调试模式", false)
    .option("-tp, --targetPath <targetPath>", "是否指定本地调试文件路径", ""); // 获取本地代码

  program
    .command("init [projectName]")
    .option("-f --force", "是否强制初始化项目")
    .action(exec); // 异步方法，需要单独捕获错误信息

  program.on('option:targetPath', (operands) => {
    process.env.CLI_TARGET_PATH = operands;
  })

  /* debug 模式 */
  program.on("option:debug", () => {
    process.env.LOG_LEVEL = program.debug ? "verbose" : "info";
  });
  log.level = process.env.LOG_LEVEL;

  /* 错误命令 捕获 */
  program.on("command:*", (obj) => {
    const availableCommands = program.commands.map((cmd) => cmd.name());
    console.log(colors.red(`未知命令：${obj[0]}`));
    if (availableCommands.length > 0) {
      console.log(colors.red(`可用命令：${availableCommands.join(",")}`));
    }
  });
  if (process.argv.length < 3) program.outputHelp();
  program.parse(process.argv);
}

/* 环境变量 */
function checkEnv() {
  const dotEnv = require("dotenv");
  const dotEnvPath = path.resolve(userHome, ".env");
  if (pathExists(dotEnvPath)) {
    dotEnv.config({
      path: dotEnvPath,
    });
  }
  createDefaultConfig();
  // log.verbose("环境变量", process.env.CLI_HOME_PATH);
}

function createDefaultConfig() {
  const cliConfig = {
    home: userHome,
  };
  cliConfig.cliHome = path.join(
    userHome,
    process.env.CLI_HOME ? process.env.CLI_HOME : constant.DEFAULT_CLI_HOME
  );
  process.env.CLI_HOME_PATH = cliConfig.cliHome;
}

// function checkInputArgs() {
//   process.env.LOG_LEVEL = args.debug
//     ? "verbose" /* log 的debug 模式 */
//     : "info";
//   log.level = process.env.LOG_LEVEL;
// }

function checkUserHome() {
  // console.log(userHome);
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red("当前用户主目录不存在！无法做缓存"));
  }
}

// function checkRoot() {
//     import rootCheck from 'root-check';
//     rootCheck();
// }

function checkVersion() {
  log.info("version", pkg.version);
}


