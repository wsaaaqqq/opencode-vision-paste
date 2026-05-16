// test/assert.mjs — Simple assertion utilities

let _passed = 0
let _failed = 0
let _total = 0

export function equal(actual, expected, label = '') {
  _total++
  if (actual === expected) {
    _passed++
    return true
  }
  _failed++
  console.error(`  FAIL [${label || 'equal'}]`)
  console.error(`    expected: ${expected}`)
  console.error(`    actual:   ${actual}`)
  return false
}

export function deepEqual(actual, expected, label = '') {
  _total++
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    _passed++
    return true
  }
  _failed++
  console.error(`  FAIL [${label || 'deepEqual'}]`)
  console.error(`    expected: ${JSON.stringify(expected, null, 2)}`)
  console.error(`    actual:   ${JSON.stringify(actual, null, 2)}`)
  return false
}

export function ok(value, label = '') {
  _total++
  if (value) {
    _passed++
    return true
  }
  _failed++
  console.error(`  FAIL [${label || 'ok'}] expected truthy, got: ${value}`)
  return false
}

export function notOk(value, label = '') {
  _total++
  if (!value) {
    _passed++
    return true
  }
  _failed++
  console.error(`  FAIL [${label || 'notOk'}] expected falsy, got: ${value}`)
  return false
}

export async function throws(fn, label = '') {
  _total++
  try {
    await fn()
    _failed++
    console.error(`  FAIL [${label || 'throws'}] expected error, but none thrown`)
    return false
  } catch (e) {
    _passed++
    return true
  }
}

export async function notThrows(fn, label = '') {
  _total++
  try {
    await fn()
    _passed++
    return true
  } catch (e) {
    _failed++
    console.error(`  FAIL [${label || 'notThrows'}] unexpected error: ${e.message}`)
    return false
  }
}

export function includes(str, substr, label = '') {
  _total++
  if (str.includes(substr)) {
    _passed++
    return true
  }
  _failed++
  console.error(`  FAIL [${label || 'includes'}]`)
  console.error(`    expected to include: ${substr}`)
  console.error(`    actual: ${str}`)
  return false
}

export function matches(str, regex, label = '') {
  _total++
  if (regex.test(str)) {
    _passed++
    return true
  }
  _failed++
  console.error(`  FAIL [${label || 'matches'}]`)
  console.error(`    expected to match: ${regex}`)
  console.error(`    actual: ${str}`)
  return false
}

export function summary() {
  const icon = _failed === 0 ? '✓' : '✗'
  console.log(`\n  ${icon} ${_passed}/${_total} passed, ${_failed} failed`)
  return _failed === 0
}

export function reset() {
  _passed = 0
  _failed = 0
  _total = 0
}

export function getStats() {
  return { passed: _passed, failed: _failed, total: _total }
}
