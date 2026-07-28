<script setup>
import { ref } from 'vue'
</script>

<template>
  <div>
    <h2 style="margin-top:0;">AI 분석</h2>
    <div class="card" style="max-width:420px;padding:24px;">
    <h3 style="margin-top:0;">진단 대상 설정</h3>
    <!-- 최고 관리자는 현장 선택, 관리자는 자신 담당 현장 불러옴 -->
      <label  class="field-label">소속 현장 선택</label> 
        <!-- <select v-model="panelForm.siteId" class="field-input">
          <option v-for="s in sites" :key="s.siteId" :value="s.siteId">{{ s.name }}</option>
        </select> -->
      <label class="field-label">진단 분전반</label>
      <!-- <select v-model="panelForm.circuitId" class="field-input">
        <option v-for="c in circuits" :key="c.circuitId" :value="c.circuitId">{{ c.name }}</option>
      </select> -->
      <label class="field-label">진단 회로</label>
      <!-- <select v-model="panelForm.circuitId" class="field-input">
        <option v-for="c in circuits" :key="c.circuitId" :value="c.circuitId">{{ c.name }}</option>
      </select> -->
      <button class="btn btn-primary">진단 시작</button>
    </div>
  </div>
</template>