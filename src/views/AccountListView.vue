<script setup>
import { ref, computed, onMounted } from 'vue'
import httpRequester from '../utils/httpRequester'
import ActionResultModal from '../components/ActionResultModal.vue'
import BaseCard from '../components/common/BaseCard.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import PageHeader from '../components/common/PageHeader.vue'
import StatusBadge from '../components/common/StatusBadge.vue'
import { ROLE_LABEL } from '../constants/roles'
import { formatResultDateTime } from '@/utils/formatters'

const users = ref([])
const selected = ref([])
const loading = ref(false)
const showDeleteConfirm = ref(false)
const deleteResult = ref(null)
const ROLE_BADGE_VARIANT = { SUPER_ADMIN: 'info', ADMIN: 'info', GENERAL: 'neutral' }

const allSelected = computed(() => users.value.length > 0 && selected.value.length === users.value.length)

// 전체 계정 선택
function toggleSelectAll() {
  selected.value = allSelected.value ? [] : users.value.map(u => u.userId)
}

// 계정 목록 조회
async function loadUsers() {
  loading.value = true
  const res = await httpRequester.get('/users')
  users.value = res.data.resultData
  selected.value = []
  loading.value = false
  // 전역 실패 알림
}
onMounted(loadUsers)

// 계정 표시 이름
function userLabel(user) {
  if (!user) return ''
  return user.name && user.email ? `${user.name} (${user.email})` : user.name || user.email || ''
}

// 선택 계정 삭제
async function confirmBulkDelete() {
  const count = selected.value.length
  const deletedAccountName = users.value
    .filter((user) => selected.value.includes(user.userId))
    .map(userLabel)
    .filter(Boolean)
    .join(', ')
  // 벌크삭제 API
  await httpRequester.patch('/users/bulk-delete', { userIds: selected.value })
  showDeleteConfirm.value = false
  deleteResult.value = {
    itemName: deletedAccountName || `계정 ${count}건`,
    time: formatResultDateTime(),
  }
  loadUsers()
}
</script>
<template>
  <div class="account-list-page">
    <PageHeader
      title="계정 관리"
      subtitle="사용자 계정과 권한을 관리합니다."
    >
      <template #actions>
        <router-link class="btn btn-primary" to="/settings/accounts/new">계정 추가</router-link>
      </template>
    </PageHeader>

    <BaseCard>
      <template #header>
        <div class="account-list-toolbar">
          <span
            class="account-list-notice"
            title="Swagger 확인 결과 GET /users는 삭제된 계정을 조회하는 방법 자체가 없음. 삭제된 계정 복구는 관리 이력 화면에서 할 수 있습니다"
          >삭제된 계정은 이 목록에 표시되지 않습니다</span>
          <button class="btn btn-danger account-list-toolbar__delete" :disabled="!selected.length" @click="showDeleteConfirm = true">
            선택 계정 삭제
          </button>
        </div>
      </template>

      <p v-if="loading" class="account-list-loading"><span class="spinner"></span>불러오는 중...</p>
      <div v-else class="account-list-table-wrap">
        <table class="account-list-table">
          <thead>
            <tr>
              <th><input type="checkbox" :checked="allSelected" @change="toggleSelectAll" /></th>
              <th>계정명</th>
              <th>이메일</th>
              <th>권한</th>
              <th>가입일</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.userId">
              <td><input type="checkbox" v-model="selected" :value="u.userId" /></td>
              <td>{{ u.name }}</td>
              <td>{{ u.email }}</td>
              <td>
                <StatusBadge :variant="ROLE_BADGE_VARIANT[u.role] || 'neutral'">
                  {{ ROLE_LABEL[u.role] ?? u.role }}
                </StatusBadge>
              </td>
              <td>{{ u.createdAt ? new Date(u.createdAt).toLocaleDateString('ko-KR') : '-' }}</td>
              <td><router-link class="btn" :to="`/settings/accounts/${u.userId}`">수정</router-link></td>
            </tr>
            <tr v-if="!users.length">
              <td colspan="6" class="account-list-table__empty">계정이 없습니다.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <ConfirmModal v-if="showDeleteConfirm" title="계정 삭제 확인"
      message="정말로 선택된 계정들을 삭제하시겠습니까?" danger
      @confirm="confirmBulkDelete" @cancel="showDeleteConfirm = false" />
    <ActionResultModal
      :visible="!!deleteResult"
      type="danger"
      title="계정 삭제 완료"
      desc="계정 정보가 삭제되었습니다."
      :item-name="deleteResult?.itemName"
      :time="deleteResult?.time"
      action-label="삭제 완료"
      @close="deleteResult = null"
    />
  </div>
</template>

<style scoped>
.account-list-page {
  min-height: 100%;
}

.account-list-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-12);
  flex-wrap: wrap;
}

.account-list-notice {
  color: var(--color-text-secondary);
  font-size: var(--font-size-caption);
}

.account-list-toolbar__delete {
  margin-left: auto;
}

.account-list-loading {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-body);
}

.account-list-table-wrap {
  width: 100%;
  overflow-x: auto;
}

.account-list-table {
  width: 100%;
  border-collapse: collapse;
}

.account-list-table th {
  padding: var(--space-12) var(--space-8);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  text-align: left;
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.account-list-table td {
  padding: var(--space-12) var(--space-8);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-size: var(--font-size-body);
}

.account-list-table tbody tr:last-child td {
  border-bottom: none;
}

.account-list-table__empty {
  padding: var(--space-24);
  color: var(--color-text-secondary);
  text-align: center;
}

@media (max-width: 720px) {
  .account-list-toolbar__delete {
    margin-left: 0;
  }

  .account-list-table {
    min-width: 640px;
  }
}
</style>
