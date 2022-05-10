# monorepo + cli 工具

## 启动项目

```
lerna bootstrap

npm link

chen-cli-dev
```

## 一、lerna 用法

- 安装依赖
  - lerna bootstrap [--scope=特定的包]
- 删除依赖
  - lerna clean
- 添加包
  - lerna add xxx [--scope=特定的包] ex: lerna add npminstall models/package
- create
  - lerna create <name> [loc]

## 二、core 库

### 涉及技术点

- 核心库
  - import-local
  - commander
- 工具库
  - npmlog（打印日志）
  - fs-extra（基于 fs 封装的库）
  - semver（版本）
  - colors
  - user-home（拿到用户主目录）
  - dotenv（环境变量）
  - root-check（权限降级）

### import-local

### 流程

在 core 核心库中安装 `import-local` 来进行本地调试

检测版本号

检测 node 版本

检测 root 启动

使用 check-root 库，对权限进行检验并降级。

```
process.env.getuid // 获取权限. root = 0
使用 downgrade-root 对权限进行降级
再使用 process.env.setgid 或者 process.env.setuid 去设置默认的 uid

使用 default-uid 设置默认的 uid
```

检查用户主目录

user-home 调用 os-homedir

path-exists 使用的就是 fs.accessSync(path)

检查入参

检查环境变量

检查是否炜最新版本

提醒更新

### 注意事项

```
某个包需要引入新包时，可以使用 lerna add xxx /路径/

对应 package.json 需要将新包的相对路径进行引入，接着重新 unlink - link，就能正常运行了
```

## 三、commander

- 高级用法

使用发布订阅模式，监听一些事件，自定义处理方式

## 四、如何支持模块化

> 什么是模块化

- CMD/AMD/require.js
- CommonJS
  - 加载：require()
  - 输出：module.exports / exports.x
- ES Module
  - 加载：import
  - 输出：export default / export function/const

## 五、node 子进程

pid：当前进程 id
ppid: 当前进程的 父进程

呈现为嵌套模型

#### shell 的使用

方法一：直接执行 shell 文件

```shell
/bin/sh test.shell
```

方法二：直接执行 shell 语句

```shell
/bin/sh -c 'ls -al|grep node_modules'
```

> 常用方法

spawn: 流式任务、耗时任务，不断打印日志（npm install）

spawn(file, [], option)

exec/execFile：开销小的任务

> exec/execFile/spawn/fork 的区别

exec：原理是调用 /bin/sh/ -c 执行我们传入的脚本、底层调用的是 execFile

execFile：直接传入 file 和 args，底层调用 spawn 创建和执行子进程。并建立回调，一次性将所有 stdout 和 stderr 结果返回

spawn：调用 internal/child_process，实例化了 ChildProcess 子进程对象，再调用 child.spawn 创建子进程并执行命令，执行命令底层调用的是 child.\_handle.spawn 执行 process_wrap 中的 spawn 方法（C++ 源码），过程为异步，执行完通过 net 的 pipe 进行单向数据通信，通信结束后子进程发起 onexit 回调，同时 Socket 会执行 close 回调

## 六、命令行交互

使用 inquirer 实现了一个简单命令行交互

使用 eggjs 实现了一个后端简单服务

通过后端返回数据下载对应模板

inquirer 源码分析

- readline
- events
- mute-stream
- rxjs
- ansi-escapes

## 七、模板注入

下载模板

stdio: inherit -- 会在主进程打印

ejs 根据配置生成对应的可用的模板

## 架构:思考

> 脚手架项目创建功能架构设计

可扩展：复用不同团队
低成本：不改动脚手架源码的情况下，新增模板
高性能：控制存储空间，充分利用 node 多进程

## 总结：问题

多个包引入同一个 npm 模块，导致整个项目过大。怎么解决

2021/08/29 阶段疑惑：生成目录去到哪里，为什么是用 cli 的目录而不是，随便哪个目录？
2021/08/29 阶段疑惑：为啥每次重新 npm i 都会丢本地包。。。需要到每个项目中去 npm i 一下才能正常。🤮
