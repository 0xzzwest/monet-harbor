export function indexAt(points: readonly number[], time: number) {
  let left = 0
  let right = points.length
  while (left < right) {
    const mid = Math.floor((left + right) / 2)
    if (points[mid] <= time) left = mid + 1
    else right = mid
  }
  return left - 1
}

export function clock(seconds: number, precision = false) {
  const ms = Math.round(seconds * 1000)
  const minute = Math.floor(ms / 60000)
  const second = Math.floor(ms / 1000) % 60
  const fraction = precision ? '.' + String(ms % 1000).padStart(3, '0') : ''
  return `${minute}:${String(second).padStart(2, '0')}${fraction}`
}
