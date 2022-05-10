"use strict";
const { spinnerStart, sleep, execAsync } = require('@chen-cli-dev/util');
const Command = require('@chen-cli-dev/command');
const Package = require('@chen-cli-dev/package');
const log = require("@chen-cli-dev/log")
const inquirer = require('inquirer');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const semver = require('semver');
const userHome = require('user-home');
const glob = require('glob');
const ejs = require('ejs');

const getProjectTemplate = require('./getProjectTemplate');

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || '';
    this.force = !!this._cmd.force;
    log.verbose('projectName', this.projectName, this.force);
  }

  checkCommand(cmd) {
    const WHITE_COMMAND = ['npm', 'cnpm'];
    if (WHITE_COMMAND.includes(cmd)) {
      return cmd;
    }
    return null;
  }

  /* 启动进程下载模板 */
  async execCommand(command, errMsg) {
    let ret;
    if (command) {
      const cmdArray = command.split(' ');
      const cmd = this.checkCommand(cmdArray[0]);
      if (!cmd) throw new Error('命令不存在！命令：' + command);
      const args = cmdArray.slice(1);
      ret = await execAsync(cmd, args, {
        stdio: 'inherit',
        cwd: process.cwd(),
      })
    }
    if (ret !== 0) throw new Error(errMsg);
    return ret;
  }

  /* ejs 渲染 */
  async ejsRender(options) {
    const dir = process.cwd();
    const projectInfo = this.projectInfo;
    return new Promise((resolve, reject) => {
      glob("**", {
        cwd: dir,
        ignore: options.ignore || '',
        nodir: true,
      }, function (err, files) {
        if (err) {
          reject(err);
          return;
        }
        Promise.all(files.map(file => {
          const filePath = path.join(dir, file);
          return new Promise((resolve1, reject1) => {
            ejs.renderFile(filePath, projectInfo, {}, (err, res) => {
              if (err) {
                reject1(err);
                return;
              }
              /* ejs 虽然更换了对应模板信息，但需要手动写入文件 */
              fse.readFileSync(filePath, res);
              resolve1(res);
            })
          })
        })).then(() => {
          resolve();
        }).catch(() => {
          reject();
        })
      })
    })
  }

  async installNormalTemplate() {
    log.verbose('templateNpm', this.templateNpm);
    let spinner = spinnerStart('正在安装模板...');
    await sleep();
    try {
      const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template');
      const targetPath = process.cwd();
      fse.ensureDirSync(templatePath)
      fse.ensureDirSync(targetPath)
      fse.copySync(templatePath, targetPath);
    } catch (error) {
      throw e;
    } finally {
      spinner.stop(true);
      log.success('模板安装成功');
    }
    const templateIgnore = this.templateInfo.ignore || [];
    const ignore = ['**/node_modules/**', ...templateIgnore];
    await this.ejsRender({ ignore });
    const { installCommand, startCommand } = this.templateInfo;
    // 依赖安装
    await this.execCommand(installCommand, '依赖安装失败！');
    // 启动命令执行
    await this.execCommand(startCommand, '启动执行命令失败！');
  }

  async installTemplate() {
    const TEMPLATE_TYPE_NORMAL = 'normal';
    const TEMPLATE_TYPE_CUSTOM = 'custom';
    if (this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
      }
      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        await this.installNormalTemplate()
      } else {
        throw new Error('无法识别项目模板类型！');
      }
    } else {
      throw new Error('项目模板信息不存在！');
    }
  }

  async downloadTemplate() {
    const { projectTemplate } = this.projectInfo;
    const templateInfo = this.template.find(item => item.npmName === projectTemplate);
    const targetPath = path.resolve(userHome, '.chen-cli-dev', 'template');
    const storeDir = path.resolve(userHome, '.chen-cli-dev', 'template', 'node_modules');
    const { npmName, version } = templateInfo;
    this.templateInfo = templateInfo;
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    });
    if (!await templateNpm.exists()) {
      const spinner = spinnerStart('正在下载模板...');
      await sleep();
      try {
        await templateNpm.install();
      } catch (e) {
        throw e;
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success('下载模板成功');
          this.templateNpm = templateNpm;
        }
      }
    } else {
      const spinner = spinnerStart('正在更新模板...');
      await sleep();
      try {
        await templateNpm.update();
      } catch (e) {
        throw e;
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success('更新模板成功');
          this.templateNpm = templateNpm;
        }
      }
    }
  }

  createTemplateChoice() {
    return this.template.map(item => ({
      value: item.npmName,
      name: item.name,
    }));
  }

  async getProjectInfo() {
    const TYPE_PROJECT = "project";
    const TYPE_COMPONENT = "component";

    function isValidName(v) {
      return /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(
        v
      );
    }

    let projectInfo = {};
    let isProjectNameValid = false;
    if (isValidName(this.projectName)) {
      isProjectNameValid = true;
      projectInfo.projectName = this.projectName;
    }

    /* 初始化类型 */
    const { type } = await inquirer.prompt({
      type: "list",
      name: "type",
      message: "请选择初始化类型",
      default: TYPE_PROJECT,
      choices: [
        {
          name: "项目",
          value: TYPE_PROJECT,
        },
        {
          name: "组件",
          value: TYPE_COMPONENT,
        },
      ],
    });
    log.verbose("type", type);

    /* 名称 */
    this.template = this.template.filter((temp) => temp.tag.includes(type));
    const title = type === TYPE_PROJECT ? "项目" : "组件";
    const projectNamePrompt = {
      type: "input",
      name: "projectName",
      message: `请输入${title}名称`,
      default: "",
      validate: function (v) {
        const done = this.async();
        setTimeout(function () {
          // 1.首字符必须为英文字符
          // 2.尾字符必须为英文或数字，不能为字符
          // 3.字符仅允许"-_"
          if (!isValidName(v)) {
            done(`请输入合法的${title}名称`);
            return;
          }
          done(null, true);
        }, 0);
      },
      filter: function (v) {
        return v;
      },
    };

    const projectPrompt = [];
    if (!isProjectNameValid) {
      projectPrompt.push(projectNamePrompt);
    }

    /* 版本号、模板 */
    projectPrompt.push(
      {
        type: "input",
        name: "projectVersion",
        message: `请输入${title}版本号`,
        default: "1.0.0",
        validate: function (v) {
          const done = this.async();
          setTimeout(function () {
            if (!!!semver.valid(v)) {
              done("请输入合法的版本号");
              return;
            }
            done(null, true);
          }, 0);
        },
        filter: function (v) {
          if (!!semver.valid(v)) {
            return semver.valid(v);
          } else {
            return v;
          }
        },
      },
      {
        type: "list",
        name: "projectTemplate",
        message: `请选择${title}模板`,
        choices: this.createTemplateChoice(),
      }
    );

    if (type === TYPE_PROJECT) {
      // 2. 获取项目的基本信息
      const project = await inquirer.prompt(projectPrompt);
      projectInfo = {
        ...projectInfo,
        type,
        ...project,
      };
    } else if (type === TYPE_COMPONENT) {
      const descriptionPrompt = {
        type: "input",
        name: "componentDescription",
        message: "请输入组件描述信息",
        default: "",
        validate: function (v) {
          const done = this.async();
          setTimeout(function () {
            if (!v) {
              done("请输入组件描述信息");
              return;
            }
            done(null, true);
          }, 0);
        },
      };
      projectPrompt.push(descriptionPrompt);
      // 2. 获取组件的基本信息
      const component = await inquirer.prompt(projectPrompt);
      projectInfo = {
        ...projectInfo,
        type,
        ...component,
      };
    }

    // 生成classname
    if (projectInfo.projectName) {
      projectInfo.name = projectInfo.projectName;
      projectInfo.className = require("kebab-case")(
        projectInfo.projectName
      ).replace(/^-/, "");
    }
    if (projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion;
    }
    if (projectInfo.componentDescription) {
      projectInfo.description = projectInfo.componentDescription;
    }

    return projectInfo;
  }

  isCwdEmpty(localPath) {
    let fileList = fs.readdirSync(localPath);
    let ignoreFile = ['node_modules']
    fileList = fileList.filter(file => (
      !file.startsWith('.') && ignoreFile.includes(file)
    ));
    return !fileList || fileList.length <= 0;
  }

  async prepare() {
    /* 判断项目模板数据是否存在 */
    const template = await getProjectTemplate();
    if (!template || template.length === 0) {
      throw new Error('项目模板不存在')
    }
    this.template = template;
    const localPath = process.cwd();
    console.log(999, localPath)
    /* 判断当前文件是否为空 */
    if (!this.isCwdEmpty(localPath)) {
      const { ifContinue } = await inquirer.prompt({
        name: 'ifContinue',
        type: 'confirm',
        default: false,
        message: '当前文件夹不为空，是否继续创建项目？'
      })
      if (!ifContinue) return;
      if (ifContinue || this.force) {
        const { confirmDelete } = await inquirer.prompt({
          name: 'confirmDelete',
          type: 'confirm',
          default: false,
          message: '是否清空当前目录下的所有文件'
        })
        if (confirmDelete) {
          fse.emptyDirSync(localPath);
        }
      }
    }

    return this.getProjectInfo();
  }

  async exec() {
    try {
      console.log('exec 逻辑')
      const projectInfo = await this.prepare();
      if (projectInfo) {
        log.verbose('projectInfo', projectInfo);
        this.projectInfo = projectInfo;
        await this.downloadTemplate();
        await this.installTemplate();
      }
    } catch (error) {
      log.error(error.message);
      if (process.env.LOG_LEVEL === 'verbose') {
        console.log(error);
      }
    }
  }
}

function init(argv) {
  return new InitCommand(argv);
  // console.log("init", projectName, cmdObj, process.env.CLI_TARGET_PATH);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
