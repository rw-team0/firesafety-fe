// 서버 LocalDateTime 표시
export function formatDateTime(value) {
  return value ? value.replace('T', ' ') : '-'
}

// 날짜 input 기본값
export function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

// 결과 모달 로컬 시각
export function formatResultDateTime(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
