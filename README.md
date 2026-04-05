# 丰源堂药品追溯扫码系统

一款基于 uni-app 开发的 Android 药品追溯码扫码 APP，用于零售药店扫描药品追溯码并上传至码上放心平台（淘宝开放平台 API）。

## 📋 功能特性

### 核心功能
- ✅ 原生摄像头扫码，自动识别 20 位数字追溯码
- ✅ 自动上传至淘宝开放平台 - 码上放心追溯系统
- ✅ 连续扫码模式，上传成功后自动继续
- ✅ 指数退避重试机制（1s → 2s → 4s）
- ✅ 离线缓存与自动同步
- ✅ 详细日志记录与导出

### UI/UX 特性
- ✅ 自定义导航栏，适配状态栏高度
- ✅ 渐变色玻璃拟态数据卡片
- ✅ 实时网络状态指示器
- ✅ 扫码音效与振动反馈
- ✅ 动画效果（脉冲、波纹、呼吸灯）
- ✅ Toast 提示系统

### 数据管理
- ✅ 今日扫码数统计
- ✅ 成功/失败计数
- ✅ 历史记录查看（最近 30 条）
- ✅ 待重试队列管理
- ✅ 日志系统（最多 50 条）

---

## 🚀 快速开始

### 环境要求
- HBuilderX 5.03+
- uni-app (Vue 3)
- Android 5.0+ / 鸿蒙系统

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd fyt_scan
```

2. **配置密钥**

复制配置文件示例：
```bash
cp config.example.js config.js
```

编辑 `config.js`，填入真实的 `appSecret`：
```javascript
export default {
    appKey: '35304606',
    appSecret: 'YOUR_APP_SECRET_HERE',  // ⚠️ 替换为真实密钥
    refEntId: '664dbe58e4b0a58416fd7b33',
    apiUrl: 'https://eco.taobao.com/router/rest',
    method: 'alibaba.alihealth.drugtrace.top.lsyd.uploadretail'
}
```

3. **使用 HBuilderX 打开项目**

4. **运行到设备**
   - 连接 Android 手机（开启 USB 调试）
   - 点击菜单栏：运行 → 运行到手机或模拟器

5. **云打包 APK**
   - 点击菜单栏：发行 → 原生 App-云打包
   - 选择 Android 平台
   - 包名：`com.fengyuantang.retail`
   - 版本：1.0.0 (versionCode: 100)

---

## 📁 项目结构

```
fyt_scan/
├── .gitignore                    # Git 忽略文件
├── README.md                     # 项目说明文档
├── config.example.js             # 配置示例（可公开）
├── config.js                     # 真实配置（不上传）⚠️
├── manifest.json                 # 应用配置
├── pages.json                    # 页面配置
├── App.vue                       # 应用入口
├── main.js                       # 主入口
├── uni.promisify.adaptor.js     # uni-app 适配器
├── uni.scss                      # 全局样式
├── pages/
│   └── index/
│       └── index.vue             # 主页面
├── static/                       # 静态资源
│   └── sounds/                   # 音效文件（可选）
└── unpackage/                    # 编译输出（不上传）
```

---

## 🔐 安全说明

### ⚠️ 重要警告

1. **绝对不要将 `config.js` 上传到代码仓库！**
   - `config.js` 已加入 `.gitignore`
   - 只提交 `config.example.js`（不含真实密钥）

2. **appSecret 保护**
   - 从码上放心平台获取后妥善保管
   - 不要在公共场合泄露
   - 定期更换密钥

3. **API 权限包**
   - 20980 - 码上放心 - 零售药店
   - 20981 - 码上放心 - 医疗机构
   - 30203 - 码上放心 - 码上传

---

## 🛠 技术实现

### API 签名算法

严格按照淘宝开放平台规范：

1. 参数按键名升序排序
2. 空值不参与签名
3. 拼接：`secret + key1 + value1 + key2 + value2 + ... + secret`
4. MD5 加密并转大写

### 重试机制

采用指数退避策略：
- 第 1 次重试：1 秒后
- 第 2 次重试：2 秒后
- 第 3 次重试：4 秒后
- 最大重试次数：3 次

### 本地存储

使用 `uni.setStorageSync` 存储：
- `fyt_stats` - 统计数据
- `fyt_history` - 历史记录（最多 30 条）
- `fyt_pending` - 待重试队列
- `fyt_logs` - 日志（最多 50 条）

---

## 🧪 测试指南

### 功能测试清单

- [ ] 扫码功能正常调用摄像头
- [ ] 20 位追溯码校验正确
- [ ] API 上传成功返回 success
- [ ] 错误处理正常（网络错误、API 错误）
- [ ] 重试机制有效
- [ ] 离线缓存有效
- [ ] 网络恢复后自动同步

### UI 测试清单

- [ ] 状态栏适配正常
- [ ] 自定义导航栏显示正确
- [ ] 动画流畅无卡顿
- [ ] 响应式布局正常

### 性能测试清单

- [ ] 扫码响应 < 500ms
- [ ] 上传超时处理正确（15 秒）
- [ ] 内存无泄漏
- [ ] 长时间运行稳定

---

## 📦 打包发布

### manifest.json 关键配置

```json
{
    "name": "丰源堂出库",
    "appid": "__UNI__11F6384",
    "versionName": "1.0.0",
    "versionCode": "100",
    "app-plus": {
        "modules": {
            "Barcode": {}
        },
        "distribute": {
            "android": {
                "package": "com.fengyuantang.retail"
            }
        }
    }
}
```

### 云打包设置

1. 平台：Android
2. 包名：`com.fengyuantang.retail`
3. 证书：公共测试证书 或 云端证书
4. 版本：1.0.0 (versionCode: 100)

---

## 🐛 常见问题

### 1. 扫码没反应？
- 检查是否授予相机权限
- 确保 `manifest.json` 中配置了 Barcode 模块
- 真机测试，模拟器可能不支持

### 2. API 上传失败？
- 检查网络连接
- 验证 `appSecret` 是否正确
- 确认 API 权限包已申请
- 查看日志弹窗中的详细错误信息

### 3. 签名错误？
- 确认参数排序正确
- 检查 MD5 实现
- 确保参数 URL 编码

### 4. 打包后无法运行？
- 检查包名是否与 manifest.json 一致
- 确认权限配置完整
- 查看 Android 日志（adb logcat）

---

## 📞 技术支持

- [淘宝开放平台 API 文档](https://open.taobao.com/api.htm)
- [码上放心追溯平台](https://pro.mashangfangxin.com)
- [uni-app 官方文档](https://uniapp.dcloud.net.cn)
- [HBuilderX 官方文档](https://hx.dcloud.net.cn)

---

## 📄 许可证

本项目仅供内部使用，未经授权不得外传。

---

## 📝 更新日志

### v1.0.0 (2024)
- ✨ 初始版本发布
- ✅ 扫码上传功能
- ✅ 离线缓存与重试
- ✅ 日志系统
- ✅ 数据统计

---

**开发团队**: 丰源堂  
**最后更新**: 2024 年
