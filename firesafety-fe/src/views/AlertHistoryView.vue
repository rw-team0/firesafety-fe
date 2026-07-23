<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import httpRequester from '../utils/httpRequester'
import ConfirmModal from '../components/ConfirmModal.vue'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const auth = useAuthStore()

const alerts = ref([])
const totalElements = ref(0)
const loading = ref(false)
const selected = ref([])
const canExport = auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN' // 관리자 이상만 출력(ALT-006)

const filters = ref({ from: '', to: '', status: '', type: '', siteId: '' })

const STATUS_LABEL = { UNCONFIRMED: '미확인', CONFIRMED: '확인됨', RESOLVED: '조치됨' }
const STATUS_COLOR = { UNCONFIRMED: 'var(--color-danger)', CONFIRMED: 'var(--color-warning)', RESOLVED: 'var(--color-success)' }

const detail = ref(null) // 선택된 알림(상세확인 팝업)
const pendingAction = ref(null) // { alertId, action: 'confirm'|'resolve' }

async function load() {
  loading.value = true
  const params = {}
  Object.entries(filters.value).forEach(([k, v]) => { if (v) params[k] = v })
  const res = await httpRequester.get('/alerts', { params }) // API-020
  alerts.value = res.data.resultData.content
  totalElements.value = res.data.resultData.totalElements
  selected.value = []
  loading.value = false
}

function openDetail(alert) {
  detail.value = alert
}

function requestAction(action) {
  pendingAction.value = { alertId: detail.value.alertId, action }
}

async function runAction() {
  const { alertId, action } = pendingAction.value
  const path = action === 'confirm' ? 'confirm' : 'resolve' // API-021 / API-022
  await httpRequester.patch(`/alerts/${alertId}/${path}`)
  pendingAction.value = null
  detail.value = null
  load()
}

async function exportExcel(onlySelected) {
  const params = {}
  Object.entries(filters.value).forEach(([k, v]) => { if (v) params[k] = v })
  if (onlySelected) params.alertIds = selected.value
  const res = await httpRequester.get('/alerts/export', { params, responseType: 'blob' }) // API-023
  const url = URL.createObjectURL(new Blob([res.data]))
  const a = document.createElement('a')
  a.href = url
  a.download = `alerts_${Date.now()}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  await load()
  // 대시보드에서 알림 클릭 시 넘어온 경우, 해당 알림 상세팝업 자동 오픈
  const targetId = route.query.alertId
  if (targetId) {
    const found = alerts.value.find(a => String(a.alertId) === String(targetId))
    if (found) openDetail(found)
  }
})
</script>

<template>
  <div>
    <h2 style="margin-top:0;">알림 이력</h2>

    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center;">
      <input v-model="filters.from" type="date" @change="load" />
      <input v-model="filters.to" type="date" @change="load" />
      <select v-model="filters.status" @change="load">
        <option value="">전체 상태</option>
        <option value="UNCONFIRMED">미확인</option>
        <option value="CONFIRMED">확인됨</option>
        <option value="RESOLVED">조치됨</option>
      </select>
      <select v-model="filters.type" @change="load">
        <option value="">전체 유형</option>
        <option value="ARC">아크</option>
        <option value="OVERHEAT">과열</option>
        <option value="LEAKAGE">누설</option>
        <option value="OVERCURRENT">과전류</option>
        <option value="COMM_LOST">통신두절</option>
      </select>
      <template v-if="canExport">
        <button class="btn" :disabled="!selected.length" @click="exportExcel(true)">선택 출력</button>
        <button class="btn" @click="exportExcel(false)">전체 출력</button>
      </template>
    </div>

    <p v-if="loading" style="color:var(--color-text-muted);">불러오는 중...</p>
    <table v-else style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="text-align:left;border-bottom:1px solid var(--color-border);">
          <th v-if="canExport" style="padding:8px;"></th>
          <th style="padding:8px;">분전반</th>
          <th style="padding:8px;">회로</th>
          <th style="padding:8px;">유형</th>
          <th style="padding:8px;">상태</th>
          <th style="padding:8px;">발생시각</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in alerts" :key="a.alertId" style="border-bottom:1px solid var(--color-border);cursor:pointer;">
          <td v-if="canExport" style="padding:8px;" @click.stop>
            <input type="checkbox" v-model="selected" :value="a.alertId" />
          </td>
          <td style="padding:8px;" @click="openDetail(a)">{{ a.panelName }}</td>
          <td style="padding:8px;" @click="openDetail(a)">채널 {{ a.circuitNo }}</td>
          <td style="padding:8px;" @click="openDetail(a)">{{ a.type }}</td>
          <td style="padding:8px;" @click="openDetail(a)">
            <span class="badge" :style="{ background: STATUS_COLOR[a.status] }">
              {{ STATUS_LABEL[a.status] ?? a.status }}
            </span>
          </td>
          <td style="padding:8px;" @click="openDetail(a)">{{ a.triggeredAt }}</td>
        </tr>
        <tr v-if="!alerts.length">
          <td :colspan="canExport ? 6 : 5" style="padding:16px;text-align:center;color:var(--color-text-muted);">알림 이력이 없습니다.</td>
        </tr>
      </tbody>
    </table>
    <p style="color:var(--color-text-muted);font-size:12px;">총 {{ totalElements }}건</p>

    <!-- 분전반 상세확인 팝업 -->
    <div v-if="detail" class="modal-overlay" @click.self="detail=null">
      <div class="modal-panel">
        <div class="modal-header" :style="{ background: STATUS_COLOR[detail.status], color:'#fff', borderBottom:'none' }">
          {{ detail.panelName }} 상세
        </div>
        <div class="modal-body">
          <p>회로: 채널 {{ detail.circuitNo }}</p>
          <p>유형: {{ detail.type }}</p>
          <p>상태: {{ STATUS_LABEL[detail.status] ?? detail.status }}</p>
          <p>발생시각: {{ detail.triggeredAt }}</p>
          <div class="modal-actions">
            <button class="btn" @click="detail=null">닫기</button>
            <button v-if="detail.status === 'UNCONFIRMED'" class="btn btn-primary" @click="requestAction('confirm')">확인 처리</button>
            <button v-if="detail.status === 'CONFIRMED'" class="btn btn-primary" @click="requestAction('resolve')">조치 완료</button>
          </div>
        </div>
      </div>
    </div>

    <ConfirmModal v-if="pendingAction" :title="pendingAction.action === 'confirm' ? '경보 확인' : '조치 완료'"
      :message="pendingAction.action === 'confirm' ? '이 경보를 확인 처리하시겠습니까?' : '조치 완료로 처리하시겠습니까?'"
      @confirm="runAction" @cancel="pendingAction=null" />
  </div>
</template>
