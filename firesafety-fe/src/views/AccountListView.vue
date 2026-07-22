<script setup>
import httpRequester from '../utils/httpRequester'

async function loadUsers() {
  loading.value = true
  const res = await httpRequester.get('/users', { params: showDeleted.value ? { status: 'DELETED' } : {} })
  users.value = res.data.resultData
  loading.value = false
  // 실패 시 alert는 인터셉터가 처리 → 여기 try/catch 자체가 필요 없어짐
}

async function confirmBulkDelete() {
  try {
    await httpRequester.post('/users/bulk-delete', { userIds: selected.value })
    // 성공했을 때만 할 일들 — try 블록에 있는 게 맞음
    showDeleteConfirm.value = false
    selected.value = []
    loadUsers()
  } catch (e) {
    // 실패 메시지는 인터셉터가 이미 띄웠음. 팝업은 열어둔 채로 재시도할 수 있게 두는 것도 방법
    // (예전처럼 여기서 또 alert('삭제에 실패했습니다') 부르면 중복 알림이 뜨니 지워야 함)
  }
}

async function restore(userId) {
  await httpRequester.patch(`/users/${userId}/restore`)
  loadUsers()
}
</script>
<template>
  <div style="display:flex;gap:8px;margin-bottom:16px;">
    <router-link to="/settings/accounts/history">관리 이력</router-link>
    <button style="margin-left:auto;" @click="showDeleteConfirm = selected.length > 0"
      :disabled="!selected.length">선택 계정 삭제</button>
    <router-link to="/settings/accounts/new">+ 계정 추가</router-link>
  </div>
  <!-- 테이블 각 행 <td><input type="checkbox" v-model="selected" :value="u.userId"></td> 추가 -->

  <ConfirmModal v-if="showDeleteConfirm" title="계정 삭제 확인"
    message="정말로 선택된 계정들을 삭제하시겠습니까?" danger
    @confirm="deleteSelected" @cancel="showDeleteConfirm=false" />
</template>