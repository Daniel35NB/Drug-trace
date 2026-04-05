/**
 * 追溯码校验工具
 */

/**
 * 校验追溯码格式
 * @param {string} code - 待校验的追溯码
 * @returns {object} { valid: boolean, message: string }
 */
export function validateDrugCode(code) {
  if (!code || typeof code !== 'string') {
    return {
      valid: false,
      message: '追溯码不能为空'
    }
  }
  
  const trimmed = code.trim()
  
  // 检查是否为纯数字
  if (!/^\d+$/.test(trimmed)) {
    return {
      valid: false,
      message: '追溯码必须为纯数字'
    }
  }
  
  // 检查长度 (标准追溯码为 20 位)
  if (trimmed.length !== 20) {
    return {
      valid: false,
      message: `追溯码长度应为 20 位，当前为${trimmed.length}位`
    }
  }
  
  // Luhn 算法校验 (可选，部分追溯码使用)
  // 如果需要可以启用
  // if (!luhnCheck(trimmed)) {
  //   return {
  //     valid: false,
  //     message: '追溯码校验失败'
  //   }
  // }
  
  return {
    valid: true,
    message: '校验通过'
  }
}

/**
 * Luhn 算法校验 (可选)
 */
function luhnCheck(code) {
  let sum = 0
  let isEven = false
  
  for (let i = code.length - 1; i >= 0; i--) {
    let digit = parseInt(code[i])
    
    if (isEven) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }
    
    sum += digit
    isEven = !isEven
  }
  
  return sum % 10 === 0
}

/**
 * 格式化追溯码 (添加空格分隔，便于阅读)
 */
export function formatDrugCode(code) {
  if (!code || code.length !== 20) return code
  // 格式：XXXXXX XXXXXX XXXXXX XXXX
  return code.replace(/(\d{6})(\d{6})(\d{6})(\d{2})/, '$1 $2 $3 $4')
}

export default {
  validateDrugCode,
  formatDrugCode
}
