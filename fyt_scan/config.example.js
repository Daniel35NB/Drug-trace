/**
 * 丰源堂药品追溯扫码系统 - 配置示例文件
 * 
 * ⚠️ 重要提示：
 * 1. 请复制此文件为 config.js
 * 2. 在 config.js 中填入真实的 appSecret
 * 3. config.js 已被加入 .gitignore，切勿上传到 Git 仓库
 */

export default {
  // 淘宝开放平台应用配置
  appKey: '35304606',
  appSecret: 'YOUR_APP_SECRET_HERE', // ⚠️ 请替换为真实密钥
  
  // 企业标识
  refEntId: '664dbe58e4b0a58416fd7b33',
  
  // API 接口地址
  apiUrl: 'https://eco.taobao.com/router/rest',
  
  // API 方法
  method: 'alibaba.alihealth.drugtrace.top.lsyd.uploadretail',
  
  // 其他可配置项
  appName: '丰源堂出库',
  version: '1.0.0',
  
  // 功能开关
  enableSound: true,      // 是否开启音效
  enableVibrate: true,    // 是否开启振动
  autoContinue: true,     // 是否默认连续扫码
  scanCooldown: 1000,     // 扫码冷却时间 (毫秒)
  
  // 日志配置
  maxLogs: 50,            // 最大日志条数
  enableDebug: false      // 是否开启调试模式 (生产环境建议关闭)
}
