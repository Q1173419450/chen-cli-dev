"use strict";

const path = require('path');
const cp = require('child_process');
const Package = require("@chen-cli-dev/package");
const log = require("@chen-cli-dev/log");

module.exports = exec;

const SETTINGS = {
  init: "@imooc-cli/init",
};

const CACHE_DIR = "dependencies";

async function exec() {
  // 1. targetPath -> modulePath（init）
  // 2. modulePath -> Package（npm 模块）
  // 3. Package.getRootFile(获取入口文件)
  const homePath = process.env.CLI_HOME_PATH;
  // E:\workplace\muke-lowCode\test-cli\chen-cli-dev\commands\init
  let targetPath = process.env.CLI_TARGET_PATH;
  let storePath = "";
  let pkg;
  log.verbose("targetPath", targetPath);
  log.verbose("homePath", homePath);
  const cmdObj = arguments[arguments.length - 1];
  const cmdName = cmdObj.name();
  const packageName = SETTINGS[cmdName];
  const packageVersion = "latest";

  if (!targetPath) {
    targetPath = path.resolve(homePath, CACHE_DIR);
    storePath = path.resolve(targetPath, "node_modules");
		pkg = new Package({
      targetPath,
			storePath,
      packageName,
      packageVersion,
    });
    if (await pkg.exists()) {
      // 更新 pkg
      await pkg.update();
    } else {
      // 安装 pkg
      await pkg.install();
    }
  } else {
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
    });
  }
  let paths = await pkg.getRootFilePath();
	// console.log("getRootFilePath" + paths)
	if (paths) {
    try {
      /*
      apply: 接收一个一个属性
      call: 接收数组
    */
		// require(paths).call(null, Array.from(arguments));
    const args = Array.from(arguments);
    const cmd = args[args.length - 1];
    const o = Object.create(null);
    Object.keys(cmd).forEach(key => {
      if (cmd.hasOwnProperty(key) && !key.startsWith('_') && key !== 'parent') {
        o[key] = cmd[key];
      }
    })
    args[args.length - 1] = o;
    const code = `require('${paths}').call(null, ${JSON.stringify(args)})`;
    const child = spawn('node', ['-e', code], {
      cwd: process.cwd(),
      stdio: 'inherit'
    })
    // child.on('error', e => {
    //   log.error(e.message);
    //   process.exit(1);
    // })
    // child.on('exit', e => {
    //   log.verbose('命令执行成功：' + e);
    //   process.exit(e);
    // })
    } catch (error) {
      log.error(error.message);
    }
	}
}

/* 兼容 windows、node 多进程 */
function spawn(command, args, options = {}) {
  const win32 = process.platform === 'win32';
  const cmd = win32 ? 'cmd' : command;
  const cmdArgs = win32 ? ['/c'].concat(command, args) : args;
  return cp.spawn(cmd, cmdArgs, options);
}