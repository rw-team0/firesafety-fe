<script setup>
import { ref, computed, onMounted } from 'vue'
import httpRequester from '../utils/httpRequester'
import ConfirmModal from '../components/ConfirmModal.vue'

const panels = ref([])
const status = ref('')
const keyword = ref('') // PanelListReq엔 keyword 파라미터가 없어서(Swagger 확인) 불러온 목록을 클라이언트에서 필터링
const appliedKeyword = ref('')
const loading = ref(false)
const selected = ref([])
const showBulkDeleteConfirm = ref(false)
const page = ref(0) // PanelListReq엔 page/size가 없어서(Swagger 확인) 클라이언트에서 페이지네이션
const PAGE_SIZE = 13
const PAGE_WINDOW = 10

// PanelStatus enum(백엔드가이드 6절): NORMAL/CAUTION/RISK/OFFLINE 4단계
const STATUS_LABEL = { NORMAL: '정상', CAUTION: '주의', RISK: '위험', OFFLINE: '오프라인' }
const STATUS_COLOR = { NORMAL: 'var(--color-success)', CAUTION: 'var(--color-warning)', RISK: 'var(--color-danger)', OFFLINE: 'var(--color-offline)' }

function formatRelative(iso) {
  if (!iso) return '-'
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (sec < 60) return `${Math.max(sec, 0)}초 전`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}분 전`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}시간 전`
  return `${Math.floor(hour / 24)}일 전`
}

async function load() {
  loading.value = true
  const params = {}
  if (status.value) params.status = status.value
  const res = await httpRequester.get('/panels', { params }) // siteId/status만 지원(Swagger 확인)
  panels.value = res.data.resultData
  selected.value = []
  page.value = 0
  loading.value = false
}
onMounted(load)

function search() {
  appliedKeyword.value = keyword.value.trim()
  page.value = 0
}

const filteredPanels = computed(() => {
  if (!appliedKeyword.value) return panels.value
  const kw = appliedKeyword.value.toLowerCase()
  return panels.value.filter((p) =>
    p.name?.toLowerCase().includes(kw) || p.mNo?.toLowerCase().includes(kw) || p.deviceSerial?.toLowerCase().includes(kw)
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredPanels.value.length / PAGE_SIZE)))
const pageNumbers = computed(() => {
  const start = Math.floor(page.value / PAGE_WINDOW) * PAGE_WINDOW
  const end = Math.min(start + PAGE_WINDOW, totalPages.value)
  return Array.from({ length: end - start }, (_, i) => start + i)
})
const pagedPanels = computed(() => filteredPanels.value.slice(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE))

function goToPage(p) {
  if (p < 0 || p >= totalPages.value) return
  page.value = p
}

const allSelected = computed(() => pagedPanels.value.length > 0 && pagedPanels.value.every((p) => selected.value.includes(p.panelId)))
function toggleSelectAll() {
  const pagedIds = pagedPanels.value.map((p) => p.panelId)
  selected.value = allSelected.value
    ? selected.value.filter((id) => !pagedIds.includes(id))
    : [...new Set([...selected.value, ...pagedIds])]
}
async function confirmBulkDelete() {
  showBulkDeleteConfirm.value = false
  // 분전반 벌크삭제 전용 API는 없음(DELETE /panels/{id} 단건만 존재, Swagger 확인) — 선택 개수만큼 순차 삭제
  for (const panelId of selected.value) {
    await httpRequester.delete(`/panels/${panelId}`)
  }
  load()
}
</script>

<template>
  <div>
    <h2 style="margin-top:0;">설비 목록</h2>

    <div style="display:flex;gap:8px;margin-bottom:16px;align-items:center;flex-wrap:wrap;">
      <input v-model="keyword" placeholder="장비번호/설비명 검색" class="field-input" style="margin-bottom:0;width:220px;" @keyup.enter="search" />
      <button class="btn" @click="search">검색</button>
      <select v-model="status" class="field-input" style="margin-bottom:0;width:140px;" @change="load">
        <option value="">전체 상태</option>
        <option value="NORMAL">정상</option>
        <option value="CAUTION">주의</option>
        <option value="RISK">위험</option>
        <option value="OFFLINE">오프라인</option>
      </select>
      <router-link class="btn" :to="{ path: '/settings/facilities', query: { tab: 'panels' } }" style="margin-left:auto;">설비 추가</router-link>
      <button class="btn btn-danger" :disabled="!selected.length" @click="showBulkDeleteConfirm = true">선택 삭제</button>
    </div>

    <p v-if="loading" style="color:var(--color-text-muted);">불러오는 중...</p>
    <table v-else style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="text-align:left;border-bottom:1px solid var(--color-border);">
          <th style="padding:8px;"><input type="checkbox" :checked="allSelected" @change="toggleSelectAll" /></th>
          <th style="padding:8px;">장비번호</th>
          <th style="padding:8px;">설비명</th>
          <th style="padding:8px;">상태</th>
          <th style="padding:8px;">마지막 일시</th>
          <th style="padding:8px;"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in pagedPanels" :key="p.panelId" style="border-bottom:1px solid var(--color-border);">
          <td style="padding:8px;" @click.stop><input type="checkbox" v-model="selected" :value="p.panelId" /></td>
          <td style="padding:8px;">{{ p.mNo || '-' }}</td>
          <td style="padding:8px;">{{ p.name }}</td>
          <td style="padding:8px;">
            <span class="badge" :style="{ background: STATUS_COLOR[p.status] }">
              {{ STATUS_LABEL[p.status] ?? p.status }}
            </span>
          </td>
          <td style="padding:8px;">{{ formatRelative(p.lastCommunicatedAt) }}</td>
          <td style="padding:8px;text-align:right;">
            <router-link :to="`/equipment/${p.panelId}`" class="btn">상세보기 &gt;</router-link>
          </td>
        </tr>
        <tr v-if="!filteredPanels.length">
          <td colspan="6" style="padding:16px;text-align:center;color:var(--color-text-muted);">설비가 없습니다.</td>
        </tr>
      </tbody>
    </table>

    <p style="color:var(--color-text-muted);font-size:12px;margin:8px 0 0;">총 {{ filteredPanels.length }}건</p>
    <div style="display:flex;justify-content:center;align-items:center;gap:4px;margin-top:10px;">
      <button class="btn" :disabled="page === 0" @click="goToPage(0)">&laquo;</button>
      <button class="btn" :disabled="page === 0" @click="goToPage(page - 1)">&lsaquo;</button>
      <button
        v-for="p in pageNumbers"
        :key="p"
        class="btn"
        :style="p === page ? { background:'var(--color-accent)', color:'#fff' } : {}"
        @click="goToPage(p)"
      >{{ p + 1 }}</button>
      <button class="btn" :disabled="page >= totalPages - 1" @click="goToPage(page + 1)">&rsaquo;</button>
      <button class="btn" :disabled="page >= totalPages - 1" @click="goToPage(totalPages - 1)">&raquo;</button>
    </div>

    <ConfirmModal v-if="showBulkDeleteConfirm" title="설비 삭제 확인"
      message="선택한 설비를 삭제하시겠습니까? 하위 회로도 함께 비활성화됩니다." danger
      @confirm="confirmBulkDelete" @cancel="showBulkDeleteConfirm=false" />
  </div>
</template>
