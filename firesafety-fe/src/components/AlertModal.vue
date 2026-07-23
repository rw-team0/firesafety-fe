<script setup>
import { useUiAlertStore } from '../stores/uiAlert'

const uiAlert = useUiAlertStore()
</script>
<template>
  <div v-if="uiAlert.message" class="modal-overlay modal-overlay-top" @click.self="uiAlert.close()">
    <div class="modal-panel">
      <div class="modal-header">알림</div>
      <div class="modal-body">
        <p>{{ uiAlert.message }}</p>
        <div class="modal-actions">
          <button class="btn btn-primary" @click="uiAlert.close()">확인</button>
        </div>
      </div>
    </div>
  </div>
</template>
