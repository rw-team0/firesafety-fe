import { http, HttpResponse } from 'msw'
import {
  mockUsers, mockSites, mockPanels, mockCircuits, mockDiagnosis,
  mockAlerts, mockUserAuditLogs, mockSiteAssignments, ids,
} from './data'

// 실제 백엔드 ResultResponse<T>{resultMessage, resultData} 형태 그대로 흉내냄
function ok(resultData, resultMessage = '성공') {
  return HttpResponse.json({ resultMessage, resultData })
}
function fail(status, resultMessage) {
  return HttpResponse.json({ resultMessage, resultData: null }, { status })
}
function stripPassword({ password, ...rest }) { return rest }
function panelOrder(status) { return { OFFLINE: 0, RISK: 1, CAUTION: 2, NORMAL: 3 }[status] ?? 9 }

const TYPE_LABEL = { ARC: '아크', OVERHEAT: '과열', LEAKAGE: '누설', OVERCURRENT: '과전류', HUMIDITY: '습도', GAS: '가스', FIRE: '불꽃', DOOR_OPEN: '도어열림', DEVICE_ERROR: '장비오류', COMM_LOST: '통신두절' }
const STATUS_LABEL = { UNCONFIRMED: '미확인', CONFIRMED: '확인됨', RESOLVED: '조치됨' }
const PANEL_STATUS_LABEL = { NORMAL: '정상', CAUTION: '주의', RISK: '위험', OFFLINE: '오프라인' }
const VERDICT_LABEL = { NORMAL: '정상', ARC: '아크' }

function countBy(list, key, labels) {
  const counts = {}
  list.forEach((item) => { counts[item[key]] = (counts[item[key]] ?? 0) + 1 })
  return Object.entries(labels).map(([k, label]) => ({ key: k, label, count: counts[k] ?? 0 }))
}

export const handlers = [
  // ── 인증(로그인 상태는 실제 쿠키 대신 모듈 메모리로 흉내냄 — Service Worker는 Set-Cookie를 실제 반영 못 함) ──
  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json()
    const user = mockUsers.find((u) => u.email === email && u.password === password && u.accountStatus === 'ACTIVE')
    if (!user) return fail(401, '아이디 또는 비밀번호가 일치하지 않습니다')
    return ok({ userId: user.userId, name: user.name, role: user.role }, '로그인 성공')
  }),
  http.post('/api/auth/logout', () => ok(null)),
  http.post('/api/auth/reissue', () => ok(null)),
  http.post('/api/auth/password-reset/request', () => ok(null, '비밀번호 재설정 메일을 발송했습니다')),
  http.post('/api/auth/password-reset/confirm', () => ok(null, '비밀번호가 재설정되었습니다')),

  // ── 회원관리 ──
  http.get('/api/users', () => ok(mockUsers.filter((u) => u.accountStatus === 'ACTIVE').map(stripPassword))),
  http.post('/api/users', async ({ request }) => {
    const body = await request.json()
    if (mockUsers.some((u) => u.email === body.email)) return fail(400, '이미 사용 중인 이메일입니다')
    const user = { userId: ids.nextUserId(), email: body.email, password: body.password, name: body.name, phone: body.phone ?? '', role: body.role, accountStatus: 'ACTIVE', createdAt: new Date().toISOString() }
    mockUsers.push(user)
    return ok(stripPassword(user))
  }),
  http.put('/api/users/:userId', async ({ params, request }) => {
    const body = await request.json()
    const user = mockUsers.find((u) => u.userId === Number(params.userId))
    if (!user) return fail(404, '존재하지 않는 계정입니다')
    Object.assign(user, { email: body.email, name: body.name, phone: body.phone ?? '', role: body.role })
    return ok(stripPassword(user))
  }),
  http.delete('/api/users/:userId', ({ params }) => {
    const user = mockUsers.find((u) => u.userId === Number(params.userId))
    if (user) user.accountStatus = 'DELETED'
    return ok(null)
  }),
  http.patch('/api/users/bulk-delete', async ({ request }) => {
    const { userIds } = await request.json()
    userIds.forEach((id) => {
      const u = mockUsers.find((x) => x.userId === id)
      if (u) u.accountStatus = 'DELETED'
    })
    return ok({ deletedUserIds: userIds })
  }),
  http.patch('/api/users/:userId/restore', ({ params }) => {
    const user = mockUsers.find((u) => u.userId === Number(params.userId))
    if (user) user.accountStatus = 'ACTIVE'
    return ok(user ? stripPassword(user) : null)
  }),
  http.get('/api/users/audit-logs', () => ok(mockUserAuditLogs)),
  http.patch('/api/users/me/fcm-token', () => ok(null)),
  http.get('/api/users/:userId/site-assignments', ({ params }) =>
    ok(mockSiteAssignments.filter((a) => a.userId === Number(params.userId)))),
  http.post('/api/users/:userId/site-assignments', async ({ params, request }) => {
    const { siteIds } = await request.json()
    const userId = Number(params.userId)
    for (let i = mockSiteAssignments.length - 1; i >= 0; i--) {
      if (mockSiteAssignments[i].userId === userId) mockSiteAssignments.splice(i, 1)
    }
    siteIds.forEach((siteId) => {
      const site = mockSites.find((s) => s.siteId === siteId)
      mockSiteAssignments.push({ mappingId: ids.nextMappingId(), userId, siteId, siteName: site?.name ?? '', siteAddress: site?.address ?? '', assignedAt: new Date().toISOString() })
    })
    return ok(mockSiteAssignments.filter((a) => a.userId === userId))
  }),

  // ── 설비관리: 현장 ──
  http.get('/api/sites', () => ok(mockSites)),
  http.post('/api/sites', async ({ request }) => {
    const body = await request.json()
    const site = { siteId: ids.nextSiteId(), name: body.name, address: body.address ?? '', createdAt: new Date().toISOString() }
    mockSites.push(site)
    return ok(site)
  }),
  http.put('/api/sites/:siteId', async ({ params, request }) => {
    const body = await request.json()
    const site = mockSites.find((s) => s.siteId === Number(params.siteId))
    if (!site) return fail(404, '존재하지 않는 현장입니다')
    Object.assign(site, { name: body.name, address: body.address ?? '' })
    return ok(site)
  }),
  http.delete('/api/sites/:siteId', ({ params }) => {
    const idx = mockSites.findIndex((s) => s.siteId === Number(params.siteId))
    if (idx >= 0) mockSites.splice(idx, 1)
    return ok(null)
  }),

  // ── 설비관리: 분전반 ──
  http.post('/api/sites/:siteId/panels', async ({ params, request }) => {
    const body = await request.json()
    const panel = {
      panelId: ids.nextPanelId(), siteId: Number(params.siteId), name: body.name, deviceSerial: body.deviceSerial,
      mNo: body.mNo ?? '', installedAt: body.installedAt || null, status: 'NORMAL', isOnline: true,
      lastCommunicatedAt: new Date().toISOString(), circuitCount: body.circuitCount ?? 1,
      leakMaThreshold: body.leakMaThreshold ?? 20, tempThreshold: body.tempThreshold ?? 80,
      humidityThreshold: body.humidityThreshold ?? 80, overcurrentThreshold: body.overcurrentThreshold ?? 30,
      gasThreshold: body.gasThreshold ?? 5000, fireThreshold: body.fireThreshold ?? 5000,
    }
    mockPanels.push(panel)
    return ok(panel)
  }),
  http.get('/api/panels', ({ request }) => {
    const url = new URL(request.url)
    const siteId = url.searchParams.get('siteId')
    const status = url.searchParams.get('status')
    let list = mockPanels
    if (siteId) list = list.filter((p) => p.siteId === Number(siteId))
    if (status) list = list.filter((p) => p.status === status)
    return ok(list)
  }),
  http.get('/api/panels/:panelId', ({ params }) => {
    const panel = mockPanels.find((p) => p.panelId === Number(params.panelId))
    return panel ? ok(panel) : fail(404, '존재하지 않는 분전반입니다')
  }),
  http.put('/api/panels/:panelId', async ({ params, request }) => {
    const body = await request.json()
    const panel = mockPanels.find((p) => p.panelId === Number(params.panelId))
    if (!panel) return fail(404, '존재하지 않는 분전반입니다')
    Object.assign(panel, body)
    return ok(panel)
  }),
  http.delete('/api/panels/:panelId', ({ params }) => {
    const idx = mockPanels.findIndex((p) => p.panelId === Number(params.panelId))
    if (idx >= 0) mockPanels.splice(idx, 1)
    return ok(null)
  }),

  // ── 설비관리: 회로 (수정 API는 실제로 없음 — mock에도 없음) ──
  http.get('/api/panels/:panelId/circuits', ({ params }) =>
    ok(mockCircuits.filter((c) => c.panelId === Number(params.panelId)))),
  http.post('/api/panels/:panelId/circuits', async ({ params, request }) => {
    const body = await request.json()
    const circuit = { circuitId: ids.nextCircuitId(), panelId: Number(params.panelId), channelNo: body.channelNo, loadType: body.loadType ?? '' }
    mockCircuits.push(circuit)
    return ok(circuit)
  }),
  http.get('/api/circuits/:circuitId', ({ params }) => {
    const circuit = mockCircuits.find((c) => c.circuitId === Number(params.circuitId))
    return circuit ? ok(circuit) : fail(404, '존재하지 않는 회로입니다')
  }),
  http.delete('/api/circuits/:circuitId', ({ params }) => {
    const idx = mockCircuits.findIndex((c) => c.circuitId === Number(params.circuitId))
    if (idx >= 0) mockCircuits.splice(idx, 1)
    return ok(null)
  }),
  http.get('/api/circuits/:circuitId/diagnosis', ({ params }) => {
    const content = mockDiagnosis.filter((d) => d.circuitId === Number(params.circuitId))
    return ok({ content, totalElements: content.length, page: 0, size: 20 })
  }),

  // ── 관제화면 ──
  http.get('/api/dashboard/summary', ({ request }) => {
    const url = new URL(request.url)
    const siteId = url.searchParams.get('siteId')
    const list = siteId ? mockPanels.filter((p) => p.siteId === Number(siteId)) : mockPanels
    const count = (status) => list.filter((p) => p.status === status).length
    return ok({
      totalPanelCount: list.length,
      normalPanelCount: count('NORMAL'),
      cautionPanelCount: count('CAUTION'),
      riskPanelCount: count('RISK'),
      offlinePanelCount: count('OFFLINE'),
      unconfirmedAlertCount: mockAlerts.filter((a) => a.status === 'UNCONFIRMED').length,
      unresolvedAlertCount: mockAlerts.filter((a) => a.status !== 'RESOLVED').length,
      panels: [...list]
        .sort((a, b) => panelOrder(a.status) - panelOrder(b.status))
        .map((p) => ({
          panelId: p.panelId,
          siteId: p.siteId,
          siteName: mockSites.find((s) => s.siteId === p.siteId)?.name ?? '',
          name: p.name,
          status: p.status,
          lastCommunicatedAt: p.lastCommunicatedAt,
          unconfirmedAlertCount: mockAlerts.filter((a) => a.panelId === p.panelId && a.status === 'UNCONFIRMED').length,
        })),
    })
  }),

  // ── 경보알림 ──
  http.get('/api/alerts', ({ request }) => {
    const url = new URL(request.url)
    let list = [...mockAlerts]
    const status = url.searchParams.get('status')
    const type = url.searchParams.get('type')
    if (status) list = list.filter((a) => a.status === status)
    if (type) list = list.filter((a) => a.type === type)
    return ok({
      content: list.map(({ panelId, resolutionNote, ...rest }) => rest),
      totalElements: list.length,
      page: 0,
      size: 20,
    })
  }),
  http.patch('/api/alerts/:alertId/confirm', ({ params }) => {
    const alert = mockAlerts.find((a) => a.alertId === Number(params.alertId))
    if (!alert) return fail(404, '존재하지 않는 경보입니다')
    if (alert.status !== 'UNCONFIRMED') return fail(409, '이미 확인된 경보입니다')
    alert.status = 'CONFIRMED'
    return ok(null)
  }),
  http.patch('/api/alerts/:alertId/resolve', async ({ params, request }) => {
    const alert = mockAlerts.find((a) => a.alertId === Number(params.alertId))
    if (!alert) return fail(404, '존재하지 않는 경보입니다')
    if (alert.status !== 'CONFIRMED') return fail(409, '확인되지 않은 경보입니다')
    const body = await request.json().catch(() => ({}))
    alert.status = 'RESOLVED'
    alert.resolutionNote = body?.resolutionNote ?? null
    return ok(null)
  }),
  http.get('/api/alerts/export', () => new HttpResponse(new Blob(['mock xlsx content']), {
    headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  })),

  // ── 통계 ──
  http.get('/api/statistics', ({ request }) => {
    const url = new URL(request.url)
    const siteId = url.searchParams.get('siteId')
    return ok({
      from: url.searchParams.get('from'),
      to: url.searchParams.get('to'),
      siteId: siteId ? Number(siteId) : null,
      alerts: {
        totalCount: mockAlerts.length,
        statusCounts: countBy(mockAlerts, 'status', STATUS_LABEL),
        typeCounts: countBy(mockAlerts, 'type', TYPE_LABEL),
        sourceCounts: [{ key: 'DEVICE', label: '하드웨어', count: mockAlerts.length }],
        dailyCounts: [
          { date: '2026-07-22', count: 1 },
          { date: '2026-07-23', count: 2 },
        ],
      },
      diagnoses: {
        totalCount: mockDiagnosis.length,
        verdictCounts: countBy(mockDiagnosis, 'verdict', VERDICT_LABEL),
      },
      panels: {
        totalCount: mockPanels.length,
        statusCounts: countBy(mockPanels, 'status', PANEL_STATUS_LABEL),
      },
    })
  }),

  // ── 설비 변경 이력(아직 FE 화면 없음, mock은 빈 목록만) ──
  http.get('/api/facilities/audit-logs', () => ok({ content: [], totalElements: 0, page: 0, size: 20 })),
]
