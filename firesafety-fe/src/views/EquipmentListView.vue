<script setup>
import { ref, onMounted, watch } from 'vue'
import httpRequester from '../utils/httpRequester'

const panels = ref([])
const status = ref('')
const keyword = ref('')
const loading = ref(false)

// PanelStatus enum(백엔드가이드 6절): NORMAL/CAUTION/RISK/OFFLINE 4단계
const STATUS_LABEL = { NORMAL: '정상', CAUTION: '주의', RISK: '위험', OFFLINE: '오프라인' }
const STATUS_COLOR = { NORMAL: 'var(--color-success)', CAUTION: 'var(--color-warning)', RISK: 'var(--color-danger)', OFFLINE: 'var(--color-offline)' }

async function load() {
  loading.value = true
  const params = {}
  if (status.value) params.status = status.value
  if (keyword.value) params.keyword = keyword.value
  const res = await httpRequester.get('/panels', { params }) // API-011
  panels.value = res.data.resultData
  loading.value = false
}
onMounted(load)
</script>

<template>
  <div>
    <h2 style="margin-top:0;">설비 목록</h2>

    <div style="display:flex;gap:8px;margin-bottom:16px;">
      <select v-model="status" @change="load">
        <option value="">전체 상태</option>
        <option value="NORMAL">정상</option>
        <option value="CAUTION">주의</option>
        <option value="RISK">위험</option>
        <option value="OFFLINE">오프라인</option>
      </select>
      <input v-model="keyword" placeholder="분전반명 검색" class="field-input" style="margin-bottom:0;width:220px;" @keyup.enter="load" />
      <button class="btn" @click="load">검색</button>
    </div>

    <p v-if="loading" style="color:var(--color-text-muted);">불러오는 중...</p>
    <table v-else style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="text-align:left;border-bottom:1px solid var(--color-border);">
          <th style="padding:8px;">분전반명</th>
          <th style="padding:8px;">상태</th>
          <th style="padding:8px;">최근 통신시각</th>
        </tr>
      </thead>
      <tbody>
        <router-link
          v-for="p in panels"
          :key="p.panelId"
          :to="`/equipment/${p.panelId}`"
          custom
          v-slot="{ navigate }"
        >
          <tr @click="navigate" style="cursor:pointer;border-bottom:1px solid var(--color-border);">
            <td style="padding:8px;">{{ p.name }}</td>
            <td style="padding:8px;">
              <span class="badge" :style="{ background: STATUS_COLOR[p.status] }">
                {{ STATUS_LABEL[p.status] ?? p.status }}
              </span>
            </td>
            <td style="padding:8px;">{{ p.lastCommunicatedAt ?? '-' }}</td>
          </tr>
        </router-link>
        <tr v-if="!panels.length">
          <td colspan="3" style="padding:16px;text-align:center;color:var(--color-text-muted);">설비가 없습니다.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
