// MSW용 인메모리 가짜 데이터. 실제 백엔드 스키마("firesafety API 가이드", 2026-07-23)를 그대로 따름 —
// 백엔드 없이 화면만 확인할 때(npm run dev:mock)만 쓰이고, 일반 dev/build엔 전혀 영향 없음.

export const mockUsers = [
  { userId: 1, email: 'super@firesafety.com', password: 'password1234', name: '최고관리자', phone: '01011112222', role: 'SUPER_ADMIN', accountStatus: 'ACTIVE', createdAt: '2026-01-01T09:00:00' },
  { userId: 2, email: 'admin@firesafety.com', password: 'password1234', name: '김관리', phone: '01022223333', role: 'ADMIN', accountStatus: 'ACTIVE', createdAt: '2026-01-05T09:00:00' },
  { userId: 3, email: 'general@firesafety.com', password: 'password1234', name: '박직원', phone: '01033334444', role: 'GENERAL', accountStatus: 'ACTIVE', createdAt: '2026-02-10T09:00:00' },
]

export const mockSites = [
  { siteId: 1, name: '레이월드1호점', address: '서울시 강남구 테헤란로 123', createdAt: '2026-01-01T09:00:00' },
  { siteId: 2, name: '레이월드2호점', address: '서울시 마포구 월드컵로 45', createdAt: '2026-01-10T09:00:00' },
]

export const mockPanels = [
  { panelId: 1, siteId: 1, name: '1층 분전반', deviceSerial: 'CSTECH-SN-00001', mNo: '10001', installedAt: '2026-01-15', status: 'NORMAL', isOnline: true, lastCommunicatedAt: '2026-07-23T17:15:48', circuitCount: 3, leakMaThreshold: 20, tempThreshold: 80, humidityThreshold: 80, overcurrentThreshold: 30, gasThreshold: 5000, fireThreshold: 5000 },
  { panelId: 2, siteId: 1, name: '2층 분전반', deviceSerial: 'CSTECH-SN-00002', mNo: '10002', installedAt: '2026-01-15', status: 'CAUTION', isOnline: true, lastCommunicatedAt: '2026-07-23T17:16:10', circuitCount: 2, leakMaThreshold: 20, tempThreshold: 80, humidityThreshold: 80, overcurrentThreshold: 30, gasThreshold: 5000, fireThreshold: 5000 },
  { panelId: 3, siteId: 2, name: '본관 분전반', deviceSerial: 'CSTECH-SN-00003', mNo: '10003', installedAt: '2026-02-01', status: 'RISK', isOnline: true, lastCommunicatedAt: '2026-07-23T17:10:00', circuitCount: 4, leakMaThreshold: 20, tempThreshold: 80, humidityThreshold: 80, overcurrentThreshold: 30, gasThreshold: 5000, fireThreshold: 5000 },
  { panelId: 4, siteId: 2, name: '별관 분전반', deviceSerial: 'CSTECH-SN-00004', mNo: '10004', installedAt: '2026-02-01', status: 'OFFLINE', isOnline: false, lastCommunicatedAt: '2026-07-23T15:00:00', circuitCount: 1, leakMaThreshold: 20, tempThreshold: 80, humidityThreshold: 80, overcurrentThreshold: 30, gasThreshold: 5000, fireThreshold: 5000 },
]

export const mockCircuits = [
  { circuitId: 1, panelId: 1, channelNo: 1, loadType: '조명', createdAt: '2026-01-16T09:00:00' },
  { circuitId: 2, panelId: 1, channelNo: 2, loadType: '콘센트', createdAt: '2026-01-16T09:00:00' },
  { circuitId: 3, panelId: 2, channelNo: 1, loadType: '조명', createdAt: '2026-01-16T09:00:00' },
  { circuitId: 4, panelId: 3, channelNo: 1, loadType: '냉난방', createdAt: '2026-02-02T09:00:00' },
]

export const mockDiagnosis = [
  { resultId: 1, circuitId: 4, frameId: 100, verdict: 'ARC', confidence: 0.92, diagnosedAt: '2026-07-23T14:35:00' },
  { resultId: 2, circuitId: 1, frameId: 101, verdict: 'NORMAL', confidence: 0.98, diagnosedAt: '2026-07-23T14:36:00' },
]

export const mockAlerts = [
  { alertId: 1, panelId: 3, panelName: '본관 분전반', circuitNo: 1, type: 'ARC', status: 'UNCONFIRMED', triggeredAt: '2026-07-23T17:15:44', resolutionNote: null },
  { alertId: 2, panelId: 2, panelName: '2층 분전반', circuitNo: null, type: 'OVERHEAT', status: 'CONFIRMED', triggeredAt: '2026-07-23T10:00:00', resolutionNote: null },
  { alertId: 3, panelId: 4, panelName: '별관 분전반', circuitNo: null, type: 'COMM_LOST', status: 'RESOLVED', triggeredAt: '2026-07-22T09:00:00', resolutionNote: '케이블 재접속' },
]

export const mockUserAuditLogs = [
  { auditId: 1, targetUserId: 3, actorUserId: 1, action: 'CREATE', actionLabel: '추가', beforeData: null, afterData: { email: 'general@firesafety.com', name: '박직원', role: 'GENERAL' }, createdAt: '2026-02-10T09:00:00' },
]

export const mockSiteAssignments = [
  { mappingId: 1, userId: 2, siteId: 1, siteName: '레이월드1호점', siteAddress: '서울시 강남구 테헤란로 123', assignedAt: '2026-01-05T09:10:00' },
  { mappingId: 2, userId: 2, siteId: 2, siteName: '레이월드2호점', siteAddress: '서울시 마포구 월드컵로 45', assignedAt: '2026-01-10T09:10:00' },
]

let seq = { user: 4, site: 3, panel: 5, circuit: 5, alert: 4, audit: 2, mapping: 3 }
export const ids = {
  nextUserId: () => seq.user++,
  nextSiteId: () => seq.site++,
  nextPanelId: () => seq.panel++,
  nextCircuitId: () => seq.circuit++,
  nextAlertId: () => seq.alert++,
  nextAuditId: () => seq.audit++,
  nextMappingId: () => seq.mapping++,
}
