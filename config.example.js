/**
 * 丰源堂药品追溯扫码系统 - 配置示例文件
 * 
 * ⚠️ 注意：此文件为示例配置，可安全上传到代码仓库
 * 
 * 使用方法：
 * 1. 复制此文件为 config.js
 * 2. 填入真实的 appSecret（从码上放心平台获取）
 * 3. config.js 已加入 .gitignore，不会被提交
 */

export default {
    // 淘宝开放平台应用配置
    appKey: '35304606',
    appSecret: 'YOUR_APP_SECRET_HERE',  // ⚠️ 请替换为真实的密钥
    
    // 企业标识
    refEntId: '664dbe58e4b0a58416fd7b33',
    
    // API 接口地址
    apiUrl: 'https://eco.taobao.com/router/rest',
    
    // API 方法
    method: 'alibaba.alihealth.drugtrace.top.lsyd.uploadretail',
    
    // 超时设置（毫秒）
    timeout: 15000,
    
    // 重试配置
    maxRetry: 3,
    retryDelay: 1000,  // 初始延迟 1 秒，指数退避
    
    // 扫码间隔（毫秒）
    scanInterval: 1000,
    
    // 日志最大保留条数
    maxLogs: 50,
    
    // 历史记录最大保留条数
    maxHistory: 30
}
