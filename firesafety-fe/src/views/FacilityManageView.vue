<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import httpRequester from '../utils/httpRequester'
import ConfirmModal from '../components/ConfirmModal.vue'
import { useAuthStore } from '../stores/auth'

// 이 화면의 현장/분전반/회로 수정·삭제 API는 실제 백엔드 Swagger(192.168.0.31:8080/swagger-ui, 2026-07-23 확인)로
// 전부 검증됨: PUT/DELETE /sites/{id}, PUT/DELETE /panels/{id}, DELETE /circuits/{id}.
// 단 회로는 "수정(PUT)" API 자체가 없음 — 등록(별도 화면)/조회/삭제만 가능(아래 회로관리 탭 참고).
// 전부 소프트삭제(deleted_at 기록, 물리삭제 아님) — 삭제 후 재조회만 하면 목록에서 자동 제외됨.

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
// 설비 목록(EquipmentListView)의 "설비 추가"에서 ?tab=panels로 넘어오면 분전반관리 탭이 바로 열리도록
const validTabs = ['sites', 'panels', 'circuits']
// ADMIN은 현장관리 탭 자체가 없어서(현장 등록은 SUPER_ADMIN 전용) 기본 탭도 분전반관리로 시작해야 함
const defaultTab = auth.role === 'SUPER_ADMIN' ? 'sites' : 'panels'
const tab = ref(validTabs.includes(route.query.tab) ? route.query.tab : defaultTab)

const sites = ref([])
async function loadSites() {
  const res = await httpRequester.get('/sites')
  sites.value = res.data.resultData
}

// ── 현장 관리(좌: 등록 전용폼, 우: 목록+선택삭제. 수정은 팝업 모달로 분리, 2026-07-24) ──
const siteSubmitting = ref(false)
const siteErrorMsg = ref('')
const selectedSiteIds = ref([])
const showSiteBulkDeleteConfirm = ref(false)
function emptySiteForm() { return { name: '', address: '' } }
const siteForm = ref(emptySiteForm())

function resetSiteForm() {
  siteForm.value = emptySiteForm()
}
async function saveSiteForm() {
  siteErrorMsg.value = ''
  if (!siteForm.value.name) {
    siteErrorMsg.value = '현장명을 입력해주세요.'
    return
  }
  siteSubmitting.value = true
  try {
    await httpRequester.post('/sites', siteForm.value)
    resetSiteForm()
    loadSites()
  } catch (e) {
    siteErrorMsg.value = e.response?.data?.resultMessage ?? '등록에 실패했습니다.'
  } finally {
    siteSubmitting.value = false
  }
}

// 현장 수정 팝업
const showEditSiteModal = ref(false)
const editSiteId = ref(null)
const editSiteForm = ref(emptySiteForm())
const editSiteSubmitting = ref(false)
const editSiteErrorMsg = ref('')
function openSiteDetail(s) {
  editSiteId.value = s.siteId
  editSiteForm.value = { name: s.name, address: s.address ?? '' }
  editSiteErrorMsg.value = ''
  showEditSiteModal.value = true
}
async function saveEditSite() {
  editSiteErrorMsg.value = ''
  if (!editSiteForm.value.name) {
    editSiteErrorMsg.value = '현장명을 입력해주세요.'
    return
  }
  editSiteSubmitting.value = true
  try {
    await httpRequester.put(`/sites/${editSiteId.value}`, editSiteForm.value)
    showEditSiteModal.value = false
    loadSites()
  } catch (e) {
    editSiteErrorMsg.value = e.response?.data?.resultMessage ?? '수정에 실패했습니다.'
  } finally {
    editSiteSubmitting.value = false
  }
}

const allSitesSelected = computed(() => sites.value.length > 0 && selectedSiteIds.value.length === sites.value.length)
function toggleSiteSelectAll() {
  selectedSiteIds.value = allSitesSelected.value ? [] : sites.value.map(s => s.siteId)
}
async function confirmSiteBulkDelete() {
  showSiteBulkDeleteConfirm.value = false
  // 현장 벌크삭제 전용 API는 없음(DELETE /sites/{id} 단건만 존재, Swagger 확인) — 선택 개수만큼 순차 삭제
  for (const siteId of selectedSiteIds.value) {
    await httpRequester.delete(`/sites/${siteId}`)
  }
  if (selectedSiteIds.value.includes(editSiteId.value)) showEditSiteModal.value = false
  selectedSiteIds.value = []
  loadSites()
  loadAllPanels()
}

// ── 분전반 관리(현장 선택 → 좌: 등록/수정폼, 우: 해당 현장 분전반 목록. 피그마 와이어프레임 기준) ──
// SiteListRes엔 panelCount/riskCount 필드가 없어서(Swagger 확인) 아래 allPanels로 클라이언트에서 직접 집계
const allPanels = ref([])
async function loadAllPanels() {
  const res = await httpRequester.get('/panels')
  allPanels.value = res.data.resultData
}

const managedPanels = ref([])
const managedPanelsLoading = ref(false)
const selectedPanelIds = ref([])
const showPanelBulkDeleteConfirm = ref(false)
const panelSubmitting = ref(false)
const panelErrorMsg = ref('')
function emptyPanelForm() {
  return {
    siteId: sites.value[0]?.siteId ?? null, name: '', deviceSerial: '', installedAt: '', circuitCount: 1,
    leakMaThreshold: null, tempThreshold: null, humidityThreshold: null,
    overcurrentThreshold: null, gasThreshold: null, fireThreshold: null, mNo: '',
  }
}
const panelForm = ref(emptyPanelForm())

async function loadManagedPanels() {
  if (!panelForm.value.siteId) { managedPanels.value = []; return }
  managedPanelsLoading.value = true
  const res = await httpRequester.get('/panels', { params: { siteId: panelForm.value.siteId } })
  const list = res.data.resultData
  // PanelListRes엔 circuitCount/등록된 회로수가 없어서(Swagger 확인) 행마다 상세+회로목록을 붙여서 채움
  managedPanels.value = await Promise.all(list.map(async (p) => {
    const [detailRes, circuitsRes] = await Promise.all([
      httpRequester.get(`/panels/${p.panelId}`),
      httpRequester.get(`/panels/${p.panelId}/circuits`),
    ])
    return { ...p, circuitCount: detailRes.data.resultData.circuitCount, registeredCount: circuitsRes.data.resultData.length }
  }))
  selectedPanelIds.value = []
  managedPanelsLoading.value = false
}
watch(() => panelForm.value.siteId, loadManagedPanels)

function resetPanelForm() {
  const siteId = panelForm.value.siteId
  panelForm.value = emptyPanelForm()
  panelForm.value.siteId = siteId
}
// 분전반 수정은 상세 페이지(EquipmentDetailView "임계값 설정")로 이관됨 — 이 폼은 신규등록 전용
async function savePanelForm() {
  panelErrorMsg.value = ''
  if (!panelForm.value.siteId || !panelForm.value.name || !panelForm.value.deviceSerial) {
    panelErrorMsg.value = '소속 현장/분전반명/일련번호를 입력해주세요.'
    return
  }

  if (panelForm.value.mNo && panelForm.value.mNo.length !== 5) {
    panelErrorMsg.value = '장비번호는 정확히 5자리여야 합니다.'
    return
  }

  panelSubmitting.value = true

  try {
    const { siteId, ...body } = panelForm.value
    await httpRequester.post(`/sites/${siteId}/panels`, body)
    resetPanelForm()
    loadManagedPanels()
    loadAllPanels()
  } catch (e) {
    panelErrorMsg.value = e.response?.data?.resultMessage ?? '저장에 실패했습니다.'
  } finally {
    panelSubmitting.value = false
  }
}
const allManagedPanelsSelected = computed(() => managedPanels.value.length > 0 && selectedPanelIds.value.length === managedPanels.value.length)
function togglePanelSelectAll() {
  selectedPanelIds.value = allManagedPanelsSelected.value ? [] : managedPanels.value.map(p => p.panelId)
}
async function confirmPanelBulkDelete() {
  showPanelBulkDeleteConfirm.value = false
  // 분전반 벌크삭제 전용 API는 없음(DELETE /panels/{id} 단건만 존재, Swagger 확인) — 선택 개수만큼 순차 삭제
  for (const panelId of selectedPanelIds.value) {
    await httpRequester.delete(`/panels/${panelId}`)
  }
  loadManagedPanels()
  loadAllPanels()
}

// ── 회로 관리(분전반 선택 → 채널 슬롯 그리드. 등록된 채널은 카드+체크박스, 빈 채널은 "+슬롯추가".
//    수정 API는 없어서(Swagger 확인) 조회/등록/삭제만 가능. 와이어프레임 기준 재구성) ──
// SUPER_ADMIN은 전체 현장의 분전반이 한 드롭다운에 다 섞여 나와서, 현장으로 먼저 좁힐 수 있게 필터 추가
const circuitSiteId = ref('')
const circuitPanelsFiltered = computed(() =>
  circuitSiteId.value ? allPanels.value.filter(p => p.siteId === circuitSiteId.value) : allPanels.value
)
function onCircuitSiteChange() {
  circuitPanelId.value = circuitPanelsFiltered.value[0]?.panelId ?? null
}

const circuitPanelId = ref(null)
const circuits = ref([])
const circuitPanelCircuitCount = ref(0)
const selectedCircuitIds = ref([])
const showCircuitBulkDeleteConfirm = ref(false)
const addingChannelNo = ref(null)
const newLoadType = ref('')

async function loadCircuits() {
  if (!circuitPanelId.value) { circuits.value = []; circuitPanelCircuitCount.value = 0; return }
  const [panelRes, circuitsRes] = await Promise.all([
    httpRequester.get(`/panels/${circuitPanelId.value}`),
    httpRequester.get(`/panels/${circuitPanelId.value}/circuits`),
  ])
  circuitPanelCircuitCount.value = panelRes.data.resultData.circuitCount ?? 0
  circuits.value = circuitsRes.data.resultData
  selectedCircuitIds.value = []
}
watch(circuitPanelId, loadCircuits)

// 분전반의 circuitCount만큼 채널 슬롯을 만들고, 등록된 회로가 있으면 채워 넣음(없으면 빈 슬롯)
const circuitSlots = computed(() => {
  const byChannel = Object.fromEntries(circuits.value.map(c => [c.channelNo, c]))
  return Array.from({ length: circuitPanelCircuitCount.value }, (_, i) => {
    const channelNo = i + 1
    return byChannel[channelNo] ?? { channelNo, empty: true }
  })
})

function startAddSlot(channelNo) {
  addingChannelNo.value = channelNo
  newLoadType.value = ''
}
function cancelAddSlot() {
  addingChannelNo.value = null
}
async function confirmAddSlot() {
  await httpRequester.post(`/panels/${circuitPanelId.value}/circuits`, {
    channelNo: addingChannelNo.value,
    loadType: newLoadType.value || undefined,
  })
  addingChannelNo.value = null
  loadCircuits()
}

const allCircuitsSelected = computed(() => circuits.value.length > 0 && selectedCircuitIds.value.length === circuits.value.length)
function toggleCircuitSelectAll() {
  selectedCircuitIds.value = allCircuitsSelected.value ? [] : circuits.value.map(c => c.circuitId)
}
async function confirmCircuitBulkDelete() {
  showCircuitBulkDeleteConfirm.value = false
  // 회로 벌크삭제 전용 API는 없음(DELETE /circuits/{id} 단건만 존재, Swagger 확인) — 선택 개수만큼 순차 삭제
  for (const circuitId of selectedCircuitIds.value) {
    await httpRequester.delete(`/circuits/${circuitId}`)
  }
  loadCircuits()
}

onMounted(async () => {
  await loadSites()
  await loadAllPanels()
  panelForm.value.siteId = sites.value[0]?.siteId ?? null
  circuitPanelId.value = allPanels.value[0]?.panelId ?? null
})
</script>

<template>
  <div>
    <h2 style="margin-top:0;">설비 관리</h2>

    <div style="display:flex;gap:8px;align-items:center;margin-bottom:16px;border-bottom:1px solid var(--color-border);padding-bottom:12px;">
      <button v-if="auth.role === 'SUPER_ADMIN'" class="btn" :class="{ 'btn-primary': tab==='sites' }" @click="tab='sites'">현장관리</button>
      <button class="btn" :class="{ 'btn-primary': tab==='panels' }" @click="tab='panels'">분전반관리</button>
      <button class="btn" :class="{ 'btn-primary': tab==='circuits' }" @click="tab='circuits'">회로관리</button>
      <!-- 2026-07-24: 사이드바로 이동시키고 여기 진입점은 주석 처리(삭제 아님)
      <router-link v-if="auth.role === 'SUPER_ADMIN'" class="btn" to="/settings/facilities/history" style="margin-left:auto;">관리 이력</router-link>
      -->
    </div>

    <!-- 현장관리: 좌 등록/수정폼 + 우 목록(선택삭제) — 분전반관리와 동일 패턴, 와이어프레임 기준 -->
    <div v-if="tab==='sites'" style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;">
      <div class="card" style="width:340px;padding:24px;flex:none;">
        <div v-if="siteErrorMsg" class="banner banner-danger">{{ siteErrorMsg }}</div>

        <label class="field-label">현장명</label>
        <input v-model="siteForm.name" placeholder="현장명" class="field-input" />

        <label class="field-label">주소</label>
        <input v-model="siteForm.address" placeholder="주소" class="field-input" />

        <div style="display:flex;gap:8px;justify-content:center;margin-top:8px;">
          <button class="btn btn-primary" style="min-width:120px;" :disabled="siteSubmitting" @click="saveSiteForm">
            {{ siteSubmitting ? '처리 중...' : '등록' }}
          </button>
          <button class="btn" style="min-width:120px;" @click="resetSiteForm">초기화</button>
        </div>
      </div>

      <div class="card" style="flex:1;min-width:360px;padding:20px;">
        <div style="display:flex;align-items:center;margin-bottom:12px;">
          <h3 style="margin:0;">현장 목록</h3>
          <button class="btn btn-danger" style="margin-left:auto;" :disabled="!selectedSiteIds.length" @click="showSiteBulkDeleteConfirm = true">선택 삭제</button>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="text-align:left;border-bottom:1px solid var(--color-border);">
              <th style="padding:8px;"><input type="checkbox" :checked="allSitesSelected" @change="toggleSiteSelectAll" /></th>
              <th style="padding:8px;">현장명</th>
              <th style="padding:8px;">주소</th>
              <th style="padding:8px;">관리</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in sites" :key="s.siteId" style="border-bottom:1px solid var(--color-border);">
              <td style="padding:8px;"><input type="checkbox" v-model="selectedSiteIds" :value="s.siteId" /></td>
              <td style="padding:8px;">{{ s.name }}</td>
              <td style="padding:8px;">{{ s.address ?? '-' }}</td>
              <td style="padding:8px;"><button class="btn" @click="openSiteDetail(s)">수정</button></td>
            </tr>
            <tr v-if="!sites.length">
              <td colspan="4" style="padding:16px;text-align:center;color:var(--color-text-muted);">등록된 현장이 없습니다.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 현장 수정 팝업 -->
    <div v-if="showEditSiteModal" class="modal-overlay" @click.self="showEditSiteModal=false">
      <div class="modal-panel" style="width:380px;">
        <div class="modal-header">현장 수정</div>
        <div class="modal-body">
          <div v-if="editSiteErrorMsg" class="banner banner-danger">{{ editSiteErrorMsg }}</div>

          <label class="field-label">현장명</label>
          <input v-model="editSiteForm.name" placeholder="현장명" class="field-input" />

          <label class="field-label">주소</label>
          <input v-model="editSiteForm.address" placeholder="주소" class="field-input" />

          <div class="modal-actions">
            <button class="btn btn-primary" style="min-width:120px;" :disabled="editSiteSubmitting" @click="saveEditSite">{{ editSiteSubmitting ? '저장 중...' : '저장' }}</button>
            <button class="btn" style="min-width:120px;" @click="showEditSiteModal=false">취소</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 분전반관리: 좌 등록/수정폼 + 우 선택 현장의 분전반 목록(피그마 와이어프레임 기준) -->
    <div v-if="tab==='panels'" style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;">
      <div class="card" style="width:340px;padding:24px;flex:none;">
        <div v-if="panelErrorMsg" class="banner banner-danger">{{ panelErrorMsg }}</div>

        <label class="field-label">소속 현장 선택</label>
        <select v-model="panelForm.siteId" class="field-input">
          <option v-for="s in sites" :key="s.siteId" :value="s.siteId">{{ s.name }}</option>
        </select>

        <label class="field-label">분전반명</label>
        <input v-model="panelForm.name" placeholder="분전반명" class="field-input" />

        <label class="field-label">일련번호(deviceSerial)</label>
        <input v-model="panelForm.deviceSerial" placeholder="일련번호" class="field-input" />

        <div style="display:flex;gap:12px;">
          <div style="flex:1;">
            <label class="field-label">회로 개수(1~10)</label>
            <input v-model.number="panelForm.circuitCount" type="number" min="1" max="10" class="field-input" />
          </div>
         <div style="flex:1;">
            <label class="field-label">장비번호(정확히 5자리)</label>
            <input v-model="panelForm.mNo" placeholder="00099" maxlength="5" class="field-input" />
          </div>
        </div>

        <p class="field-label" style="font-weight:600;color:var(--color-text);">환경 임계값 설정</p>
        <p style="font-size:12px;color:var(--color-text-muted);margin:-8px 0 12px;word-break:keep-all;">설정값 이상이 30초 이상 지속되면 '주의' 상태로 전환됩니다.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px;">
          <div>
            <label class="field-label">zct 누설전류(mA)</label>
            <input v-model.number="panelForm.leakMaThreshold" type="number" class="field-input" />
          </div>
          <div>
            <label class="field-label">온도(도)</label>
            <input v-model.number="panelForm.tempThreshold" type="number" class="field-input" />
          </div>
          <div>
            <label class="field-label">습도(%)</label>
            <input v-model.number="panelForm.humidityThreshold" type="number" class="field-input" />
          </div>
          <div>
            <label class="field-label">과전류(A)</label>
            <input v-model.number="panelForm.overcurrentThreshold" type="number" class="field-input" />
          </div>
          <div>
            <label class="field-label">가스</label>
            <input v-model.number="panelForm.gasThreshold" type="number" class="field-input" />
          </div>
          <div>
            <label class="field-label">불꽃</label>
            <input v-model.number="panelForm.fireThreshold" type="number" class="field-input" />
          </div>
        </div>

        <div style="display:flex;gap:8px;justify-content:center;margin-top:8px;">
          <button class="btn btn-primary" style="min-width:120px;" :disabled="panelSubmitting" @click="savePanelForm">
            {{ panelSubmitting ? '처리 중...' : '등록' }}
          </button>
          <button class="btn" style="min-width:120px;" @click="resetPanelForm">취소</button>
        </div>
      </div>

      <div class="card" style="flex:1;min-width:360px;padding:20px;">
        <div style="display:flex;align-items:center;margin-bottom:12px;">
          <h3 style="margin:0;">분전반 목록</h3>
          <button class="btn btn-danger" style="margin-left:auto;" :disabled="!selectedPanelIds.length" @click="showPanelBulkDeleteConfirm = true">선택 삭제</button>
        </div>
        <p v-if="managedPanelsLoading" style="color:var(--color-text-muted);">불러오는 중...</p>
        <table v-else style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="text-align:left;border-bottom:1px solid var(--color-border);">
              <th style="padding:8px;"><input type="checkbox" :checked="allManagedPanelsSelected" @change="togglePanelSelectAll" /></th>
              <th style="padding:8px;">분전반명</th>
              <th style="padding:8px;">소속현장</th>
              <th style="padding:8px;">회로 수</th>
              <th style="padding:8px;">관리</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in managedPanels" :key="p.panelId" style="border-bottom:1px solid var(--color-border);">
              <td style="padding:8px;"><input type="checkbox" v-model="selectedPanelIds" :value="p.panelId" /></td>
              <td style="padding:8px;">{{ p.name }}</td>
              <td style="padding:8px;">{{ sites.find(s => s.siteId === p.siteId)?.name ?? '-' }}</td>
              <td style="padding:8px;">{{ p.registeredCount }}/{{ p.circuitCount }}</td>
              <td style="padding:8px;">
                <button class="btn" @click="router.push(`/equipment/${p.panelId}`)">상세</button>
              </td>
            </tr>
            <tr v-if="!managedPanels.length">
              <td colspan="5" style="padding:16px;text-align:center;color:var(--color-text-muted);">등록된 분전반이 없습니다.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 회로관리: 채널 슬롯 그리드(와이어프레임 기준). 등록된 회로=카드+체크박스, 빈 채널="+슬롯추가".
         수정 API는 없어서(Swagger 확인) 조회/등록/삭제만 가능 -->
    <div v-if="tab==='circuits'">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <template v-if="auth.role === 'SUPER_ADMIN'">
          <label class="field-label" style="margin-bottom:0;">현장 선택</label>
          <select v-model="circuitSiteId" class="field-input" style="margin-bottom:0;width:160px;" @change="onCircuitSiteChange">
            <option value="">전체 현장</option>
            <option v-for="s in sites" :key="s.siteId" :value="s.siteId">{{ s.name }}</option>
          </select>
        </template>
        <label class="field-label" style="margin-bottom:0;">분전반 선택</label>
        <select v-model="circuitPanelId" class="field-input" style="margin-bottom:0;width:220px;">
          <option v-for="p in circuitPanelsFiltered" :key="p.panelId" :value="p.panelId">{{ p.name }}</option>
        </select>
        <button class="btn btn-danger" style="margin-left:auto;" :disabled="!selectedCircuitIds.length" @click="showCircuitBulkDeleteConfirm = true">선택 삭제</button>
      </div>

      <p class="field-label" style="font-weight:600;color:var(--color-text);">회로 추가(최대 {{ circuitPanelCircuitCount }}개까지)</p>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;">
        <div v-for="slot in circuitSlots" :key="slot.channelNo" class="card" style="padding:14px;text-align:center;position:relative;min-height:64px;">
          <template v-if="slot.empty">
            <template v-if="addingChannelNo === slot.channelNo">
              <input v-model="newLoadType" placeholder="부하유형(선택)" class="field-input" style="margin-bottom:6px;font-size:12px;padding:6px 8px;" @keyup.enter="confirmAddSlot" />
              <div style="display:flex;gap:4px;justify-content:center;">
                <button class="btn btn-primary" style="padding:4px 8px;font-size:12px;" @click="confirmAddSlot">등록</button>
                <button class="btn" style="padding:4px 8px;font-size:12px;" @click="cancelAddSlot">취소</button>
              </div>
            </template>
            <div v-else style="cursor:pointer;color:var(--color-text-muted);" @click="startAddSlot(slot.channelNo)">
              <div style="font-size:22px;line-height:1;">+</div>
              <div style="font-size:12px;">슬롯 추가</div>
            </div>
          </template>
          <template v-else>
            <input type="checkbox" v-model="selectedCircuitIds" :value="slot.circuitId" style="position:absolute;top:8px;right:8px;" />
            <div style="font-weight:700;">회로 {{ slot.channelNo }}</div>
            <div style="font-size:11px;color:var(--color-text-muted);">{{ slot.loadType || '-' }}</div>
          </template>
        </div>
        <p v-if="!circuitPanelCircuitCount" style="color:var(--color-text-muted);grid-column:1 / -1;">분전반을 선택해주세요.</p>
      </div>
    </div>

    <ConfirmModal v-if="showCircuitBulkDeleteConfirm" title="회로 삭제 확인"
      message="선택한 회로를 삭제하시겠습니까?" danger
      @confirm="confirmCircuitBulkDelete" @cancel="showCircuitBulkDeleteConfirm=false" />
    <ConfirmModal v-if="showPanelBulkDeleteConfirm" title="분전반 삭제 확인"
      message="선택한 분전반을 삭제하시겠습니까? 하위 회로도 함께 비활성화됩니다." danger
      @confirm="confirmPanelBulkDelete" @cancel="showPanelBulkDeleteConfirm=false" />
    <ConfirmModal v-if="showSiteBulkDeleteConfirm" title="현장 삭제 확인"
      message="선택한 현장을 삭제하시겠습니까? 하위 분전반도 함께 비활성화됩니다." danger
      @confirm="confirmSiteBulkDelete" @cancel="showSiteBulkDeleteConfirm=false" />
  </div>
</template>
