<script setup>
import { computed } from 'vue'
import BaseModal from './common/BaseModal.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: true,
  },
  title: {
    type: String,
    default: '',
  },
  subtitle: {
    type: String,
    default: '',
  },
  message: {
    type: String,
    default: '',
  },
  note: {
    type: String,
    default: '',
  },
  itemName: {
    type: String,
    default: '',
  },
  itemLabel: {
    type: String,
    default: '',
  },
  confirmText: {
    type: String,
    default: '',
  },
  cancelText: {
    type: String,
    default: '취소',
  },
  confirmType: {
    type: String,
    default: 'primary',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  danger: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['confirm', 'cancel'])

const modalType = computed(() => {
  if (props.danger || props.confirmType === 'danger') return 'danger'
  if (props.confirmType === 'success') return 'success'
  return 'primary'
})

const displayMessage = computed(() => props.message || props.subtitle)
const hasInfo = computed(() => props.itemLabel || props.itemName)
const resolvedConfirmText = computed(() => {
  if (props.loading) return '처리 중...'
  if (props.confirmText) return props.confirmText
  return modalType.value === 'danger' ? '삭제' : '확인'
})

function confirm() {
  if (!props.loading) {
    emit('confirm')
  }
}
</script>

<template>
  <BaseModal
    :visible="visible"
    :title="title"
    :hide-footer="true"
    @close="emit('cancel')"
  >
    <template #header>
      <div class="modal-header" :class="{ danger: modalType === 'danger' }">
        {{ title }}
        <button type="button" class="modal-close" aria-label="닫기" @click="emit('cancel')">×</button>
      </div>
    </template>

    <template #body>
      <div class="modal-body">
        <p
          v-if="displayMessage"
          :style="{ color: 'var(--color-text)', margin: note || hasInfo ? '0 0 6px' : '0 0 16px' }"
        >
          {{ displayMessage }}
        </p>
        <div v-if="hasInfo" class="confirm-info" :class="`confirm-info-${modalType}`">
          <span v-if="itemLabel" class="confirm-info-label">{{ itemLabel }}</span>
          <strong v-if="itemName" class="confirm-info-name">{{ itemName }}</strong>
        </div>
        <p v-if="note" style="margin:0 0 16px;">{{ note }}</p>
        <slot />
        <div class="modal-actions">
          <button
            type="button"
            class="btn"
            :class="{
              'btn-primary': modalType === 'primary',
              'btn-danger': modalType === 'danger',
              'confirm-success': modalType === 'success',
            }"
            :disabled="loading"
            @click="confirm"
          >
            {{ resolvedConfirmText }}
          </button>
          <button type="button" class="btn" :disabled="loading" @click="emit('cancel')">{{ cancelText }}</button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.confirm-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin: 8px 0 16px;
  border-left: 4px solid var(--color-accent);
  border-radius: var(--radius-md);
  background: var(--color-bg);
}

.confirm-info-danger {
  border-left-color: var(--color-danger);
  background: rgba(236, 34, 31, .08);
}

.confirm-info-success {
  border-left-color: var(--color-success);
  background: rgba(20, 174, 92, .08);
}

.confirm-info-label {
  flex: none;
  color: var(--color-text-muted);
  font-size: 12px;
}

.confirm-info-name {
  min-width: 0;
  color: var(--color-text);
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.confirm-success {
  background: var(--color-success);
  border-color: var(--color-success);
  color: #fff;
}
</style>
