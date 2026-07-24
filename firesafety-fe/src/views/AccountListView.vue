<script setup>
import { ref, computed, onMounted } from 'vue'
import httpRequester from '../utils/httpRequester'
import ConfirmModal from '../components/ConfirmModal.vue'
import { ROLE_LABEL } from '../constants/roles'

const users = ref([])
const selected = ref([])
const loading = ref(false)
const showDeleteConfirm = ref(false)

const allSelected = computed(() => users.value.length > 0 && selected.value.length === users.value.length)

function toggleSelectAll() {
  selected.value = allSelected.value ? [] : users.value.map(u => u.userId)
}

async function loadUsers() {
  loading.value = true
  const res = await httpRequester.get('/users')
  users.value = res.data.resultData
  selected.value = []
  loading.value = false
  // 실패 시 alert는 인터셉터가 처리 → 여기 try/catch 자체가 필요 없어짐
}
onMounted(loadUsers)

async function confirmBulkDelete() {
  // Swagger 확인: PATCH /api/users/bulk-delete, body {userIds}. ACC-006(확인 팝업 1회로 전체 삭제) 충족.
  await httpRequester.patch('/users/bulk-delete', { userIds: selected.value })
  showDeleteConfirm.value = false
  loadUsers()
}
</script>
<template>
  <div>
    <h2 style="margin-top:0;">계정 목록</h2>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
      <router-link class="btn" to="/settings/accounts/new">+ 계정 추가</router-link>
      <!-- 2026-07-24: 사이드바로 이동시키고 여기 진입점은 주석 처리(삭제 아님)
      <router-link class="btn" to="/settings/accounts/history">관리 이력</router-link>
      -->
      <span
        style="margin-left:16px;font-size:12.5px;color:var(--color-text-muted);"
        title="Swagger 확인 결과 GET /users는 삭제된 계정을 조회하는 방법 자체가 없음. 삭제된 계정 복구는 관리 이력 화면에서 할 수 있습니다"
      >삭제된 계정은 이 목록에 표시되지 않습니다</span>
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
          <th style="padding:8px;">이메일</th>
          <th style="padding:8px;">권한</th>
          <th style="padding:8px;">가입일</th>
          <th style="padding:8px;">관리</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.userId" style="border-bottom:1px solid var(--color-border);">
          <td style="padding:8px;"><input type="checkbox" v-model="selected" :value="u.userId" /></td>
          <td style="padding:8px;">{{ u.name }}</td>
          <td style="padding:8px;">{{ u.email }}</td>
          <td style="padding:8px;">{{ ROLE_LABEL[u.role] ?? u.role }}</td>
          <td style="padding:8px;">{{ u.createdAt ? new Date(u.createdAt).toLocaleDateString('ko-KR') : '-' }}</td>
          <td style="padding:8px;"><router-link class="btn" :to="`/settings/accounts/${u.userId}`">수정</router-link></td>
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
