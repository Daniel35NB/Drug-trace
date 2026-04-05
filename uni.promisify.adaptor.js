/**
 * uni-app Promise 适配器
 * 用于将 uni-app 的 callback 风格 API 转换为 Promise 风格
 */

// #ifdef VUE3
import { hasOwn, isFunction, createPromiseBehaviour } from '@vue/shared'

const createPromise = createPromiseBehaviour()

export const promisify = (name) => {
    return function(...args) {
        if (args.length > 0 && typeof args[args.length - 1] === 'function') {
            return uni[name](...args)
        }
        return new Promise((resolve, reject) => {
            args.push({
                success: resolve,
                fail: reject
            })
            uni[name](...args)
        })
    }
}

export const addPromiseSupport = (obj) => {
    for (const key in obj) {
        if (hasOwn(obj, key) && isFunction(obj[key])) {
            obj[key + 'Async'] = promisify(key)
        }
    }
}
// #endif

// #ifndef VUE3
uni.promisify = uni.promisify || {}
// #endif
