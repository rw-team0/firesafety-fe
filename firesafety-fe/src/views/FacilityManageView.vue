<script setup>
import { ref, onMounted, watch } from 'vue'
import httpRequester from '../utils/httpRequester'
import ConfirmModal from '../components/ConfirmModal.vue'
import { useAuthStore } from '../stores/auth'

// TODO(백엔드 확인 필요): 이 화면의 수정/삭제 API(현장·분전반·회로)는 "API 명세서" 표에 없음
// (등록/조회만 있었음). 아래 PUT/DELETE는 API-004~006(계정 수정/삭제)과 동일한 REST 관례로
// 가정한 것 — 티켓에서도 "API-029/030/032/033/037/038, 임의 부여 번호"라고 명시했으니
// 정확한 URL 확인되면 교체할 것. 소프트삭제 자체는 백엔드가이드 8.1절에 확정되어 있음
// (물리삭제 아님, 목록엔 자동으로 deleted_at IS NULL만 노출되므로 FE는 삭제 후 재조회만 하면 됨)

const auth = useAuthStore()
const tab = ref('sites') // 'sites' | 'panels' | 'circuits'

// ── 현장 관리 ──
const sites = ref([])
const editingSiteId = ref(null)
const siteForm = ref({ name: '', address: '' })
async function loadSites() {
  const res = await httpRequester.get('/sites') // API-009
  sites.value = res.data.resultData
}
function startEditSite(s) {
  editingSiteId.value = s.siteId
  siteForm.value = { name: s.name, address: s.address ?? '' }
}
async function saveSite(siteId) {
  await httpRequester.put(`/sites/${siteId}`, siteForm.value)
  editingSiteId.value = null
  loadSites()
}

// ── 분전반 관리 ──
const panels = ref([])
const editingPanelId = ref(null)
const panelForm = ref({ deviceSerial: '', mNo: '' })
async function loadPanels() {
  const res = await httpRequester.get('/panels') // API-011
  panels.value = res.data.resultData
}
function startEditPanel(p) {
  editingPanelId.value = p.panelId
  panelForm.value = { deviceSerial: p.deviceSerial ?? '', mNo: p.mNo ?? '' }
}
async function savePanel(panelId) {
  await httpRequester.put(`/panels/${panelId}`, panelForm.value)
  editingPanelId.value = null
  loadPanels()
}

// ── 회로 관리 (분전반 하나 골라서 그 안의 회로 목록) ──
const circuitPanelId = ref(null)
const circuits = ref([])
const editingCircuitId = ref(null)
const circuitForm = ref({ loadType: '' })
async function loadCircuits() {
  if (!circuitPanelId.value) return
  const res = await httpRequester.get(`/panels/${circuitPanelId.value}`) // API-012
  circuits.value = res.data.resultData.circuits ?? []
}
watch(circuitPanelId, loadCircuits)
function startEditCircuit(c) {
  editingCircuitId.value = c.circuitId
  circuitForm.value = { loadType: c.loadType ?? '' }
}
async function saveCircuit(circuitId) {
  await httpRequester.put(`/circuits/${circuitId}`, circuitForm.value)
  editingCircuitId.value = null
  loadCircuits()
}

// ── 공통 소프트삭제 확인 팝업 ──
const pendingDelete = ref(null) // { type, id, label }
function confirmDelete(type, id, label) {
  pendingDelete.value = { type, id, label }
}
async function doDelete() {
  const { type, id } = pendingDelete.value
  if (type === 'site') await httpRequester.delete(`/sites/${id}`)
  else if (type === 'panel') await httpRequester.delete(`/panels/${id}`)
  else if (type === 'circuit') await httpRequester.delete(`/circuits/${id}`)
  pendingDelete.value = null
  if (type === 'site') loadSites()
  else if (type === 'panel') loadPanels()
  else if (type === 'circuit') loadCircuits()
}

onMounted(() => {
  loadSites()
  loadPanels()
})
watch(panels, (v) => {
  if (v.length && !circuitPanelId.value) circuitPanelId.value = v[0].panelId
})
</script>

<template>
  <div>
    <h2 style="margin-top:0;">설비 관리</h2>

    <div style="display:flex;gap:8px;align-items:center;margin-bottom:16px;border-bottom:1px solid var(--color-border);padding-bottom:12px;">
      <button v-if="auth.role === 'SUPER_ADMIN'" class="btn" :class="{ 'btn-primary': tab==='sites' }" @click="tab='sites'">현장관리</button>
      <button class="btn" :class="{ 'btn-primary': tab==='panels' }" @click="tab='panels'">분전반관리</button>
      <button class="btn" :class="{ 'btn-primary': tab==='circuits' }" @click="tab='circuits'">회로관리</button>
      <router-link v-if="tab==='sites'" class="btn" to="/settings/sites" style="margin-left:auto;">+ 현장 등록</router-link>
      <router-link v-if="tab==='panels'" class="btn" to="/settings/panels" style="margin-left:auto;">+ 분전반 등록</router-link>
      <router-link v-if="tab==='circuits'" class="btn" to="/settings/circuits" style="margin-left:auto;">+ 회로 등록</router-link>
    </div>

    <!-- 현장관리 -->
    <table v-if="tab==='sites'" style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="text-align:left;border-bottom:1px solid var(--color-border);">
          <th style="padding:8px;">현장명</th><th style="padding:8px;">주소</th><th style="padding:8px;">분전반수</th><th style="padding:8px;">관리</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in sites" :key="s.siteId" style="border-bottom:1px solid var(--color-border);">
          <template v-if="editingSiteId === s.siteId">
            <td style="padding:8px;"><input v-model="siteForm.name" class="field-input" style="margin-bottom:0;" /></td>
            <td style="padding:8px;"><input v-model="siteForm.address" class="field-input" style="margin-bottom:0;" /></td>
            <td style="padding:8px;">{{ s.panelCount }}</td>
            <td style="padding:8px;">
              <button class="btn btn-primary" @click="saveSite(s.siteId)">저장</button>
              <button class="btn" @click="editingSiteId=null">취소</button>
            </td>
          </template>
          <template v-else>
            <td style="padding:8px;">{{ s.name }}</td>
            <td style="padding:8px;">{{ s.address ?? '-' }}</td>
            <td style="padding:8px;">{{ s.panelCount }}</td>
            <td style="padding:8px;">
              <button class="btn" @click="startEditSite(s)">수정</button>
              <button class="btn btn-danger" @click="confirmDelete('site', s.siteId, s.name)">삭제</button>
            </td>
          </template>
        </tr>
      </tbody>
    </table>

    <!-- 분전반관리 -->
    <table v-if="tab==='panels'" style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="text-align:left;border-bottom:1px solid var(--color-border);">
          <th style="padding:8px;">분전반명</th><th style="padding:8px;">상태</th><th style="padding:8px;">최근통신</th><th style="padding:8px;">관리</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in panels" :key="p.panelId" style="border-bottom:1px solid var(--color-border);">
          <template v-if="editingPanelId === p.panelId">
            <td style="padding:8px;"><input v-model="panelForm.deviceSerial" placeholder="일련번호" class="field-input" style="margin-bottom:0;" /></td>
            <td style="padding:8px;" colspan="2"><input v-model="panelForm.mNo" placeholder="M_NO" class="field-input" style="margin-bottom:0;" /></td>
            <td style="padding:8px;">
              <button class="btn btn-primary" @click="savePanel(p.panelId)">저장</button>
              <button class="btn" @click="editingPanelId=null">취소</button>
            </td>
          </template>
          <template v-else>
            <td style="padding:8px;">{{ p.name }}</td>
            <td style="padding:8px;">{{ p.status }}</td>
            <td style="padding:8px;">{{ p.lastCommunicatedAt ?? '-' }}</td>
            <td style="padding:8px;">
              <button class="btn" @click="startEditPanel(p)">수정</button>
              <button class="btn btn-danger" @click="confirmDelete('panel', p.panelId, p.name)">삭제</button>
            </td>
          </template>
        </tr>
      </tbody>
    </table>

    <!-- 회로관리 -->
    <div v-if="tab==='circuits'">
      <label style="display:block;margin-bottom:8px;">분전반 선택</label>
      <select v-model="circuitPanelId" class="field-input" style="width:320px;">
        <option v-for="p in panels" :key="p.panelId" :value="p.panelId">{{ p.name }}</option>
      </select>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="text-align:left;border-bottom:1px solid var(--color-border);">
            <th style="padding:8px;">채널</th><th style="padding:8px;">부하유형</th><th style="padding:8px;">관리</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in circuits" :key="c.circuitId" style="border-bottom:1px solid var(--color-border);">
            <td style="padding:8px;">채널 {{ c.channelNo }}</td>
            <template v-if="editingCircuitId === c.circuitId">
              <td style="padding:8px;"><input v-model="circuitForm.loadType" class="field-input" style="margin-bottom:0;" /></td>
              <td style="padding:8px;">
                <button class="btn btn-primary" @click="saveCircuit(c.circuitId)">저장</button>
                <button class="btn" @click="editingCircuitId=null">취소</button>
              </td>
            </template>
            <template v-else>
              <td style="padding:8px;">{{ c.loadType ?? '-' }}</td>
              <td style="padding:8px;">
                <button class="btn" @click="startEditCircuit(c)">수정</button>
                <button class="btn btn-danger" @click="confirmDelete('circuit', c.circuitId, `채널 ${c.channelNo}`)">삭제</button>
              </td>
            </template>
          </tr>
          <tr v-if="!circuits.length">
            <td colspan="3" style="padding:16px;text-align:center;color:var(--color-text-muted);">등록된 회로가 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <ConfirmModal v-if="pendingDelete" title="삭제 확인"
      :message="`'${pendingDelete.label}'을(를) 삭제하시겠습니까?`" danger
      @confirm="doDelete" @cancel="pendingDelete=null" />
  </div>
</template>
