<script setup>
import { ref, onMounted } from 'vue'
import { ROLE_LABEL } from '../constants/roles'

// TODO: 계정관리이력 조회 API가 백엔드 명세에 없음(/users/history 같은 엔드포인트 없음).
// 추가되면 아래를 실제 호출로 교체:
// import httpRequester from '../utils/httpRequester'
// const res = await httpRequester.get('/users/history') // API-041(가정)
// logs.value = res.data.resultData

const logs = ref([])
const loading = ref(false)

const badgeStyle = {
  CREATE: { background: 'var(--color-success)', label: '추가' },
  UPDATE: { background: 'var(--color-warning)', label: '수정' },
  DELETE: { background: 'var(--color-danger)', label: '삭제' },
}

onMounted(async () => {
  loading.value = false
  // 백엔드 API가 생기기 전까지는 항상 빈 목록
})
</script>

<template>
  <div>
    <h2 style="margin-top:0;">계정 관리 이력</h2>
    <p style="color:var(--color-text-muted);font-size:12.5px;">
      ※ 계정관리이력 조회 API가 아직 백엔드에 없어 목록이 항상 비어 있습니다. API 추가 후 연결 예정입니다.
    </p>

    <p v-if="loading" style="color:var(--color-text-muted);">불러오는 중...</p>
    <table v-else style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="text-align:left;border-bottom:1px solid var(--color-border);">
          <th style="padding:8px;">대상계정</th>
          <th style="padding:8px;">대상계정역할</th>
          <th style="padding:8px;">관리계정명</th>
          <th style="padding:8px;">관리유형</th>
          <th style="padding:8px;">내용</th>
          <th style="padding:8px;">관리시점</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in logs" :key="log.id" style="border-bottom:1px solid var(--color-border);">
          <td style="padding:8px;">{{ log.targetName }}</td>
          <td style="padding:8px;">{{ ROLE_LABEL[log.targetRole] ?? log.targetRole }}</td>
          <td style="padding:8px;">{{ log.actorName }}</td>
          <td style="padding:8px;">
            <span class="badge" :style="{ background: badgeStyle[log.actionType]?.background }">
              {{ badgeStyle[log.actionType]?.label ?? log.actionType }}
            </span>
          </td>
          <td style="padding:8px;">{{ log.content }}</td>
          <td style="padding:8px;">{{ log.createdAt }}</td>
        </tr>
        <tr v-if="!logs.length">
          <td colspan="6" style="padding:16px;text-align:center;color:var(--color-text-muted);">이력이 없습니다.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
