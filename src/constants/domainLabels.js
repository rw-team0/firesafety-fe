// 백엔드 enum 화면 라벨
export const USER_ROLE_LABELS = {
  SUPER_ADMIN: '플랫폼관리자',
  ADMIN: '현장관리자',
  GENERAL: '일반직원',
}

export const PANEL_STATUS_LABELS = {
  NORMAL: '정상',
  CAUTION: '주의',
  RISK: '위험',
  OFFLINE: '오프라인',
}

export const VERDICT_LABELS = {
  NORMAL: '정상',
  ARC: '아크',
}

export const ALERT_SOURCE_LABELS = {
  DEVICE: '하드웨어',
  AI: 'AI분석',
  SYSTEM: '시스템',
}

export const ALERT_TYPE_LABELS = {
  ARC: '아크',
  OVERHEAT: '과열',
  LEAKAGE: '누전',
  OVERCURRENT: '과전류',
  HUMIDITY: '습도',
  GAS: '가스',
  FIRE: '불꽃',
  DOOR_OPEN: '문열림',
  DEVICE_ERROR: '장비오류',
  COMM_LOST: '통신두절',
}

export const ALERT_STATUS_LABELS = {
  UNCONFIRMED: '미확인',
  CONFIRMED: '확인됨',
  RESOLVED: '조치됨',
}
