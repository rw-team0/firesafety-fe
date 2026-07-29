<script setup>
import BaseModal from './common/BaseModal.vue'
import { useUiAlertStore } from '../stores/uiAlert'

const uiAlert = useUiAlertStore()
</script>
<template>
  <BaseModal
    :visible="!!uiAlert.message"
    title="알림"
    @close="uiAlert.close()"
  >
    <p class="alert-modal__message">{{ uiAlert.message }}</p>

    <template #footer>
      <div class="alert-modal__actions">
        <button class="btn btn-primary" @click="uiAlert.close()">확인</button>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.alert-modal__message {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-line;
}

.alert-modal__actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 0 18px 18px;
}
</style>
