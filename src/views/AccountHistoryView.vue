<script setup>
import { ref, computed, onMounted } from 'vue'
import httpRequester from '../utils/httpRequester'
import { ROLE_LABEL } from '../constants/roles'
import ActionResultModal from '../components/ActionResultModal.vue'
import BaseCard from '../components/common/BaseCard.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import BasePagination from '../components/common/BasePagination.vue'
import PageHeader from '../components/common/PageHeader.vue'
import StatusBadge from '../components/common/StatusBadge.vue'
import { useUiAlertStore } from '../stores/uiAlert'
import { formatDateTime, formatResultDateTime, isoDate } from '@/utils/formatters'

const uiAlert = useUiAlertStore()

// 이력/계정 조인
const logs = ref([])
const usersById = ref({})
const loading = ref(false)
const restoringId = ref(null)
const restoreResult = ref(null)

// 페이지 상태
const page = ref(0)
const PAGE_SIZE = 13
const selected = ref([])

// 검색 상태
const keyword = ref('')
const appliedKeyword = ref('')
// 기간 프리셋 드롭다운 → 달력(from/to 날짜입력)으로 교체하면서 period는 더 이상 안 씀(주석 처리, 삭제 아님)
// const period = ref('')

// 기본 기간
const today = new Date()
const weekAgo = new Date(today)
weekAgo.setDate(weekAgo.getDate() - 7)
const filters = ref({ from: isoDate(weekAgo), to: isoDate(today) })

// 작업 뱃지 색
const ACTION_BADGE_VARIANT = { CREATE: 'success', UPDATE: 'info', DELETE: 'danger', RESTORE: 'success', PASSWORD_RESET: 'neutral' }

// 대상 계정명
function targetLabel(userId) {
  const u = usersById.value[userId]
  return u ? `${u.name} (${ROLE_LABEL[u.role] ?? u.role})` : `#${userId}`
}

// 결과 계정명
function userResultLabel(data) {
  if (!data) return ''
  return data.name && data.email ? `${data.name} (${data.email})` : data.name || data.email || ''
}

// 복구 대상명
function restoreTargetLabel(userId) {
  const user = usersById.value[userId]
  if (user) return userResultLabel(user)
  const log = logs.value.find((item) => item.action === 'DELETE' && item.targetUserId === userId)
  return userResultLabel(log?.beforeData) || userResultLabel(log?.afterData) || `#${userId}`
}

// 관리 계정명
function actorLabel(userId) {
  if (userId == null) return '시스템'
  const u = usersById.value[userId]
  return u ? u.name : `#${userId}`
}

// 표시 필드
const FIELD_LABEL = { name: '이름', role: '권한', email: '이메일', phone: '연락처' }

// 역할값 표시
function formatFieldValue(field, value) {
  if (value == null) return '-'
  return field === 'role' ? ROLE_LABEL[value] ?? value : value
}

// 변경 요약
function summarize(log) {
  // 수정 필드 비교
  if (log.action === 'UPDATE' && log.beforeData && log.afterData) {
    const changed = Object.keys(FIELD_LABEL).filter((k) => log.beforeData[k] !== log.afterData[k])
    if (!changed.length) return '변경사항 없음'
    return changed.map((k) => `${FIELD_LABEL[k]}: ${formatFieldValue(k, log.beforeData[k])} → ${formatFieldValue(k, log.afterData[k])}`).join(', ')
  }

  const data = log.action === 'DELETE' ? log.beforeData : log.afterData
  if (!data || typeof data !== 'object') return '-'
  return Object.keys(FIELD_LABEL)
    .filter((k) => data[k] !== undefined)
    .map((k) => `${FIELD_LABEL[k]}: ${formatFieldValue(k, data[k])}`)
    .join(', ')
}

// 목록 안에서 검색
function search() {
  appliedKeyword.value = keyword.value.trim()
  page.value = 0
}
// 기간 프리셋 드롭다운 → 달력(from/to 날짜입력)으로 교체하면서 더 이상 안 씀(주석 처리, 삭제 아님)
// function applyPeriod() {
//   const iso = (d) => d.toISOString().slice(0, 10)
//   const today = new Date()
//   if (period.value === 'today') {
//     filters.value.from = iso(today)
//     filters.value.to = iso(today)
//   } else if (period.value === '7d') {
//     const from = new Date(today); from.setDate(from.getDate() - 7)
//     filters.value.from = iso(from)
//     filters.value.to = iso(today)
//   } else if (period.value === '30d') {
//     const from = new Date(today); from.setDate(from.getDate() - 30)
//     filters.value.from = iso(from)
//     filters.value.to = iso(today)
//   } else {
//     filters.value.from = ''
//     filters.value.to = ''
//   }
//   page.value = 0
// }

// 날짜 변경
function onDateFilterChange() {
  page.value = 0
}

// 필터 적용
const filteredLogs = computed(() => {
  let result = logs.value
  if (appliedKeyword.value) {
    const kw = appliedKeyword.value.toLowerCase()
    result = result.filter((l) => targetLabel(l.targetUserId).toLowerCase().includes(kw) || actorLabel(l.actorUserId).toLowerCase().includes(kw))
  }
  if (filters.value.from) result = result.filter((l) => l.createdAt.slice(0, 10) >= filters.value.from)
  if (filters.value.to) result = result.filter((l) => l.createdAt.slice(0, 10) <= filters.value.to)
  return result
})

// 페이지 계산
const totalPages = computed(() => Math.max(1, Math.ceil(filteredLogs.value.length / PAGE_SIZE)))
const pagedLogs = computed(() => filteredLogs.value.slice(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE))

// 페이지 이동
function goToPage(p) {
  if (p < 0 || p >= totalPages.value) return
  page.value = p
}

// 전체 이력 선택
const allSelected = computed(() => filteredLogs.value.length > 0 && selected.value.length === filteredLogs.value.length)
function toggleSelectAll() {
  selected.value = allSelected.value ? [] : filteredLogs.value.map((l) => l.auditId)
}

// 엑셀 안내
function exportExcel() {
  // 출력 API 없음
  uiAlert.show('계정 관리이력 엑셀 출력 기능은 아직 백엔드에 구현되어 있지 않습니다.')
}

// 이력 목록 조회
async function load() {
  loading.value = true
  const [logsRes, usersRes] = await Promise.all([
    httpRequester.get('/users/audit-logs'),
    httpRequester.get('/users'),
  ])
  logs.value = logsRes.data.resultData
  usersById.value = Object.fromEntries(usersRes.data.resultData.map(u => [u.userId, u]))
  page.value = 0
  selected.value = []
  loading.value = false
}
onMounted(load)

// 계정 복구
async function restore(userId) {
  const restoredAccountName = restoreTargetLabel(userId)
  restoringId.value = null
  await httpRequester.patch(`/users/${userId}/restore`)
  restoreResult.value = {
    itemName: restoredAccountName,
    time: formatResultDateTime(),
  }
  load()
}
</script>

<template>
  <div class="account-history-page">
    <PageHeader
      title="계정 관리 이력"
      subtitle="계정 생성, 수정, 삭제 및 복구 이력을 확인합니다."
    >
      <template #actions>
        <button class="btn" @click="exportExcel">전체 출력</button>
        <router-link class="btn" to="/settings/accounts">계정목록으로</router-link>
      </template>
    </PageHeader>

    <BaseCard>
      <template #header>
        <!-- 검색 조건 -->
        <div class="account-history-filter">
          <input
            v-model="keyword"
            placeholder="대상계정/관리계정명 검색"
            class="field-input account-history-filter__keyword"
            @keyup.enter="search"
          />
          <button class="btn" @click="search">검색</button>
          <input v-model="filters.from" type="date" class="field-input account-history-filter__date" @change="onDateFilterChange" />
          <span class="account-history-filter__dash">~</span>
          <input v-model="filters.to" type="date" class="field-input account-history-filter__date" @change="onDateFilterChange" />
          <button class="btn account-history-filter__selected" :disabled="!selected.length" @click="exportExcel">선택 출력</button>
        </div>
      </template>

      <p v-if="loading" class="account-history-loading"><span class="spinner"></span>불러오는 중...</p>
      <template v-else>
        <!-- 이력 목록 -->
        <div class="account-history-table-wrap">
          <table class="account-history-table">
            <colgroup>
              <col class="account-history-table__check">
              <col class="account-history-table__target">
              <col class="account-history-table__actor">
              <col class="account-history-table__action">
              <col>
              <col class="account-history-table__time">
              <col class="account-history-table__restore">
            </colgroup>
            <thead>
              <tr>
                <th><input type="checkbox" :checked="allSelected" @change="toggleSelectAll" /></th>
                <th>대상계정</th>
                <th>관리계정</th>
                <th>관리유형</th>
                <th>변경 내용</th>
                <th>관리시점</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in pagedLogs" :key="log.auditId">
                <td><input type="checkbox" v-model="selected" :value="log.auditId" /></td>
                <td class="account-history-table__wrap">{{ targetLabel(log.targetUserId) }}</td>
                <td class="account-history-table__wrap">{{ actorLabel(log.actorUserId) }}</td>
                <td>
                  <StatusBadge :variant="ACTION_BADGE_VARIANT[log.action] || 'neutral'">
                    {{ log.actionLabel ?? log.action }}
                  </StatusBadge>
                </td>
                <td class="account-history-table__summary">{{ summarize(log) }}</td>
                <td>{{ formatDateTime(log.createdAt) }}</td>
                <td>
                  <button v-if="log.action === 'DELETE'" class="btn" @click="restoringId = log.targetUserId">복구</button>
                </td>
              </tr>
              <tr v-if="!filteredLogs.length">
                <td colspan="7" class="account-history-table__empty">이력이 없습니다.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template #footer>
        <!-- 페이지네이션 -->
        <div v-if="!loading" class="account-history-pagination">
          <BasePagination
            :current-page="page"
            :total-pages="totalPages"
            :total-items="filteredLogs.length"
            @change="goToPage"
          />
        </div>
      </template>
    </BaseCard>

    <ConfirmModal v-if="restoringId" title="계정 복구 확인"
      message="이 계정을 복구하시겠습니까?"
      @confirm="restore(restoringId)" @cancel="restoringId = null" />
    <ActionResultModal
      :visible="!!restoreResult"
      title="계정 복구 완료"
      desc="계정 정보가 복구되었습니다."
      :item-name="restoreResult?.itemName"
      :time="restoreResult?.time"
      action-label="복구 완료"
      @close="restoreResult = null"
    />
  </div>
</template>

<style scoped>
.account-history-page {
  min-height: 100%;
}

.account-history-filter {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  flex-wrap: wrap;
}

.account-history-filter__keyword,
.account-history-filter__date {
  margin-bottom: 0;
}

.account-history-filter__keyword {
  width: 200px;
}

.account-history-filter__date {
  width: 150px;
}

.account-history-filter__dash {
  color: var(--color-text-secondary);
}

.account-history-filter__selected {
  margin-left: auto;
}

.account-history-loading {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-body);
}

.account-history-table-wrap {
  width: 100%;
  overflow-x: auto;
}

.account-history-table {
  width: 100%;
  min-width: 860px;
  border-collapse: collapse;
  table-layout: fixed;
}

.account-history-table__check {
  width: 36px;
}

.account-history-table__target {
  width: 20%;
}

.account-history-table__actor {
  width: 14%;
}

.account-history-table__action {
  width: 9%;
}

.account-history-table__time {
  width: 150px;
}

.account-history-table__restore {
  width: 80px;
}

.account-history-table th {
  padding: var(--space-12) var(--space-8);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  text-align: left;
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.account-history-table td {
  padding: var(--space-12) var(--space-8);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-size: var(--font-size-body);
}

.account-history-table tbody tr:last-child td {
  border-bottom: none;
}

.account-history-table__wrap,
.account-history-table__summary {
  overflow-wrap: break-word;
}

.account-history-table__summary {
  color: var(--color-text-secondary);
  font-size: var(--font-size-caption);
}

.account-history-table__empty {
  padding: var(--space-24);
  color: var(--color-text-secondary);
  text-align: center;
}

.account-history-pagination :deep(.base-pagination) {
  margin-top: 0;
}

@media (max-width: 720px) {
  .account-history-filter__selected {
    margin-left: 0;
  }
}
</style>
