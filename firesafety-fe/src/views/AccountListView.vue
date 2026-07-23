<script setup>
import { ref, computed, onMounted } from 'vue'
import httpRequester from '../utils/httpRequester'
import ConfirmModal from '../components/ConfirmModal.vue'
import { ROLE_LABEL } from '../constants/roles'
import { useUiAlertStore } from '../stores/uiAlert'

const uiAlert = useUiAlertStore()

const users = ref([])
const selected = ref([])
const loading = ref(false)
const showDeleteConfirm = ref(false)
// API-003(GET /api/users)엔 role 파라미터만 있고 삭제상태 필터가 없음 → 백엔드 지원 전까지 비활성화
const showDeleted = ref(false)

const allSelected = computed(() => users.value.length > 0 && selected.value.length === users.value.length)

function toggleSelectAll() {
  selected.value = allSelected.value ? [] : users.value.map(u => u.userId)
}

function formatLastLogin(v) {
  if (!v) return '-'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString('ko-KR')
}

async function loadUsers() {
  loading.value = true
  // API-003: GET /api/users (파라미터: role만 지원, 삭제상태 필터 없음)
  const res = await httpRequester.get('/users')
  users.value = res.data.resultData
  selected.value = []
  loading.value = false
  // 실패 시 alert는 인터셉터가 처리 → 여기 try/catch 자체가 필요 없어짐
}
onMounted(loadUsers)

async function confirmBulkDelete() {
  // TODO: 벌크삭제 API가 백엔드 명세에 없음(API-006은 DELETE /api/users/{userId} 단건뿐).
  // ACC-006("확인 팝업 1회로 전체 삭제, 개별 API 반복호출 아님") 요구사항을 만족하려면
  // 벌크삭제 API(예: POST /users/bulk-delete)가 추가돼야 함. 추가되면 아래 주석을 해제.
  //
  // try {
  //   await httpRequester.post('/users/bulk-delete', { userIds: selected.value })
  //   showDeleteConfirm.value = false
  //   loadUsers()
  // } catch (e) {
  //   // 실패 메시지는 인터셉터가 이미 띄웠음
  // }
  uiAlert.show('벌크 삭제 API가 아직 백엔드에 없습니다. (백엔드 추가 후 AccountListView.vue의 confirmBulkDelete 주석 해제)')
  showDeleteConfirm.value = false
}

async function restore(userId) {
  // TODO: 복구 API가 백엔드 명세에 없음. API-006 설명상 DELETE가 FK CASCADE로 실제 row를
  // 지우는 하드삭제로 보여서, 소프트삭제+복구가 되려면 백엔드 쪽 설계 변경이 먼저 필요함.
  // await httpRequester.patch(`/users/${userId}/restore`)
  // loadUsers()
  uiAlert.show(`복구 API가 아직 백엔드에 없습니다. (userId: ${userId})`)
}
</script>
<template>
  <div>
    <h2 style="margin-top:0;">계정 목록</h2>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
      <router-link class="btn" to="/settings/accounts/new">+ 계정 추가</router-link>
      <router-link class="btn" to="/settings/accounts/history">관리 이력</router-link>
      <label
        style="margin-left:16px;font-size:12.5px;color:var(--color-text-muted);display:flex;align-items:center;gap:4px;"
        title="백엔드에 삭제 상태 조회 API가 아직 없어 비활성화되어 있습니다"
      >
        <input type="checkbox" v-model="showDeleted" disabled />삭제된 계정 보기
      </label>
      <button class="btn btn-danger" style="margin-left:auto;" :disabled="!selected.length" @click="showDeleteConfirm = true">
        선택 계정 삭제
      </button>
    </div>

    <p v-if="loading" style="color:var(--color-text-muted);">불러오는 중...</p>
    <table v-else style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="text-align:left;border-bottom:1px solid var(--color-border);">
          <th style="padding:8px;"><input type="checkbox" :checked="allSelected" @change="toggleSelectAll" /></th>
          <th style="padding:8px;">계정명</th>
          <th style="padding:8px;">역할</th>
          <th style="padding:8px;">담당현장</th>
          <th style="padding:8px;">최근 로그인</th>
          <th style="padding:8px;">관리</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.userId" style="border-bottom:1px solid var(--color-border);">
          <td style="padding:8px;"><input type="checkbox" v-model="selected" :value="u.userId" /></td>
          <td style="padding:8px;">{{ u.name }}</td>
          <td style="padding:8px;">{{ ROLE_LABEL[u.role] ?? u.role }}</td>
          <td style="padding:8px;">{{ (u.siteNames ?? []).join(', ') || '-' }}</td>
          <td style="padding:8px;">{{ formatLastLogin(u.lastLoginAt) }}</td>
          <td style="padding:8px;">
            <button v-if="showDeleted" class="btn" @click="restore(u.userId)">복구</button>
            <router-link v-else class="btn" :to="`/settings/accounts/${u.userId}`">수정</router-link>
          </td>
        </tr>
        <tr v-if="!users.length">
          <td colspan="6" style="padding:16px;text-align:center;color:var(--color-text-muted);">계정이 없습니다.</td>
        </tr>
      </tbody>
    </table>

    <ConfirmModal v-if="showDeleteConfirm" title="계정 삭제 확인"
      message="정말로 선택된 계정들을 삭제하시겠습니까?" danger
      @confirm="confirmBulkDelete" @cancel="showDeleteConfirm = false" />
  </div>
</template>
