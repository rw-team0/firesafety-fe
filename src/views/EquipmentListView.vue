<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import httpRequester from '../utils/httpRequester'
import ConfirmModal from '../components/ConfirmModal.vue'
import BaseCard from '../components/common/BaseCard.vue'
import BasePagination from '../components/common/BasePagination.vue'
import PageHeader from '../components/common/PageHeader.vue'
import StatusBadge from '../components/common/StatusBadge.vue'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const panels = ref([])
// PanelListRes엔 siteId만 있고 현장명이 없어서(Swagger 확인) /sites와 조인 — SUPER_ADMIN만 여러 현장이 섞여
// 보이므로 이 컬럼도 SUPER_ADMIN에게만 노출(ADMIN/GENERAL은 자기 현장만 보여서 불필요)
const sitesById = ref({})
const status = ref('')
const keyword = ref('') // PanelListReq엔 keyword 파라미터가 없어서(Swagger 확인) 불러온 목록을 클라이언트에서 필터링
const appliedKeyword = ref('')
const loading = ref(false)
const selected = ref([])
const showBulkDeleteConfirm = ref(false)
const page = ref(0) // PanelListReq엔 page/size가 없어서(Swagger 확인) 클라이언트에서 페이지네이션
const PAGE_SIZE = 13

// PanelStatus enum(백엔드가이드 6절): NORMAL/CAUTION/RISK/OFFLINE 4단계
const STATUS_LABEL = { NORMAL: '정상', CAUTION: '주의', RISK: '위험', OFFLINE: '오프라인' }

// 상대 시각
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

// 설비/현장 같이 조회
async function load() {
  loading.value = true
  const params = {}
  if (status.value) params.status = status.value
  const [panelsRes, sitesRes] = await Promise.all([
    httpRequester.get('/panels', { params }), // siteId/status만 지원(Swagger 확인)
    httpRequester.get('/sites'),
  ])
  panels.value = panelsRes.data.resultData
  sitesById.value = Object.fromEntries(sitesRes.data.resultData.map((s) => [s.siteId, s]))
  selected.value = []
  page.value = 0
  loading.value = false
}
onMounted(load)

// 목록 안에서 검색
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
const pagedPanels = computed(() => filteredPanels.value.slice(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE))

// 페이지 이동
function goToPage(p) {
  if (p < 0 || p >= totalPages.value) return
  page.value = p
}

const allSelected = computed(() => pagedPanels.value.length > 0 && pagedPanels.value.every((p) => selected.value.includes(p.panelId)))

// 현재 페이지 선택
function toggleSelectAll() {
  const pagedIds = pagedPanels.value.map((p) => p.panelId)
  selected.value = allSelected.value
    ? selected.value.filter((id) => !pagedIds.includes(id))
    : [...new Set([...selected.value, ...pagedIds])]
}

// 단건 삭제 반복
async function confirmBulkDelete() {
  showBulkDeleteConfirm.value = false
  // 벌크삭제 API 없음
  for (const panelId of selected.value) {
    await httpRequester.delete(`/panels/${panelId}`)
  }
  load()
}
</script>

<template>
  <div class="equipment-list-page">
    <PageHeader
      title="설비 목록"
      subtitle="분전반 상태와 최근 통신 시간을 확인하고 관리합니다."
    >
      <template #actions>
        <router-link class="btn btn-primary" :to="{ path: '/settings/facilities', query: { tab: 'panels' } }">
          설비 추가
        </router-link>
      </template>
    </PageHeader>

    <BaseCard>
      <template #header>
        <div class="equipment-list-toolbar">
          <input
            v-model="keyword"
            placeholder="장비번호/설비명 검색"
            class="field-input equipment-list-toolbar__search"
            @keyup.enter="search"
          />
          <button class="btn" @click="search">검색</button>
          <select v-model="status" class="field-input equipment-list-toolbar__status" @change="load">
            <option value="">전체 상태</option>
            <option value="NORMAL">정상</option>
            <option value="CAUTION">주의</option>
            <option value="RISK">위험</option>
            <option value="OFFLINE">오프라인</option>
          </select>
          <button class="btn btn-danger equipment-list-toolbar__delete" :disabled="!selected.length" @click="showBulkDeleteConfirm = true">
            선택 삭제
          </button>
        </div>
      </template>

      <p v-if="loading" class="equipment-list-loading"><span class="spinner"></span>불러오는 중...</p>
      <div v-else class="equipment-list-table-wrap">
        <table class="equipment-list-table">
          <thead>
            <tr>
              <th><input type="checkbox" :checked="allSelected" @change="toggleSelectAll" /></th>
              <th>장비번호</th>
              <th v-if="auth.role === 'SUPER_ADMIN'">현장</th>
              <th>분전반명</th>
              <th>상태</th>
              <th>마지막 일시</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in pagedPanels" :key="p.panelId" class="equipment-list-table__row" @click="router.push(`/equipment/${p.panelId}`)">
              <td @click.stop><input type="checkbox" v-model="selected" :value="p.panelId" /></td>
              <td>{{ p.mNo || '-' }}</td>
              <td v-if="auth.role === 'SUPER_ADMIN'">{{ sitesById[p.siteId]?.name ?? '-' }}</td>
              <td>{{ p.name }}</td>
              <td>
                <StatusBadge :status="p.status">
                  {{ STATUS_LABEL[p.status] ?? p.status }}
                </StatusBadge>
              </td>
              <td>{{ formatRelative(p.lastCommunicatedAt) }}</td>
              <td class="equipment-list-table__actions" @click.stop>
                <router-link :to="`/equipment/${p.panelId}`" class="btn">상세보기 &gt;</router-link>
              </td>
            </tr>
            <tr v-if="!filteredPanels.length">
              <td :colspan="auth.role === 'SUPER_ADMIN' ? 7 : 6" class="equipment-list-table__empty">설비가 없습니다.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <template #footer>
        <div class="equipment-list-pagination">
          <BasePagination
            :current-page="page"
            :total-pages="totalPages"
            :total-items="filteredPanels.length"
            @change="goToPage"
          />
        </div>
      </template>
    </BaseCard>

    <ConfirmModal v-if="showBulkDeleteConfirm" title="설비 삭제 확인"
      message="선택한 설비를 삭제하시겠습니까? 하위 회로도 함께 비활성화됩니다." danger
      @confirm="confirmBulkDelete" @cancel="showBulkDeleteConfirm=false" />
  </div>
</template>

<style scoped>
.equipment-list-page {
  min-height: 100%;
}

.equipment-list-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  flex-wrap: wrap;
}

.equipment-list-toolbar__search,
.equipment-list-toolbar__status {
  margin-bottom: 0;
}

.equipment-list-toolbar__search {
  width: 220px;
}

.equipment-list-toolbar__status {
  width: 140px;
}

.equipment-list-toolbar__delete {
  margin-left: auto;
}

.equipment-list-loading {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-body);
}

.equipment-list-table-wrap {
  width: 100%;
  overflow-x: auto;
}

.equipment-list-table {
  width: 100%;
  border-collapse: collapse;
}

.equipment-list-table th {
  padding: var(--space-12) var(--space-8);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  text-align: left;
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.equipment-list-table td {
  padding: var(--space-12) var(--space-8);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-size: var(--font-size-body);
}

.equipment-list-table tbody tr:last-child td {
  border-bottom: none;
}

.equipment-list-table__row {
  cursor: pointer;
}

.equipment-list-table__row:hover td {
  background: var(--color-page-bg);
}

.equipment-list-table__actions {
  text-align: right;
}

.equipment-list-table__empty {
  padding: var(--space-24);
  color: var(--color-text-secondary);
  text-align: center;
}

.equipment-list-pagination :deep(.base-pagination) {
  margin-top: 0;
}

@media (max-width: 720px) {
  .equipment-list-toolbar__delete {
    margin-left: 0;
  }

  .equipment-list-table {
    min-width: 680px;
  }
}
</style>
