// uni.promisify.adaptor.js
// uni-app 适配器，用于将 callback 风格的 API 转换为 Promise 风格

uni.addInterceptor({
  returnValue(res) {
    if (!(!!res && (typeof res === "object" || typeof res === "function") && typeof res.then === "function")) {
      return new Promise((resolve, reject) => {
        if (res.errMsg && res.errMsg.indexOf(':fail') !== -1) {
          reject(res)
        } else {
          resolve(res)
        }
      })
    }
  }
})
