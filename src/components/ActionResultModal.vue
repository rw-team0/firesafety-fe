<script setup>
import { computed } from 'vue'
import BaseModal from './common/BaseModal.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  subtitle: {
    type: String,
    default: '',
  },
  desc: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: 'success',
  },
  itemName: {
    type: String,
    default: '',
  },
  time: {
    type: String,
    default: '',
  },
  actionLabel: {
    type: String,
    default: '',
  },
  actor: {
    type: String,
    default: '',
  },
  infoRows: {
    type: Array,
    default: () => [],
  },
  confirmText: {
    type: String,
    default: '확인',
  },
})

const emit = defineEmits(['close'])

const modalType = computed(() => {
  if (props.type === 'danger') return 'danger'
  if (props.type === 'warning') return 'warning'
  return 'success'
})

const resolvedTitle = computed(() => props.title || '처리가 완료되었습니다')

const detailRows = computed(() => {
  const rows = [...props.infoRows]
  if (props.itemName) rows.push({ label: '처리 항목', value: props.itemName })
  if (props.time) rows.push({ label: '처리 시각', value: props.time })
  if (props.actionLabel) rows.push({ label: '처리 내용', value: props.actionLabel })
  if (props.actor) rows.push({ label: '처리자', value: props.actor })
  return rows.filter((row) => row?.label && row?.value != null && row.value !== '')
})
</script>

<template>
  <BaseModal
    :visible="visible"
    :title="resolvedTitle"
    :hide-header="true"
    @close="emit('close')"
  >
    <div class="result-modal" :class="`is-${modalType}`">
      <div class="result-modal__icon" :class="`is-${modalType}`" aria-hidden="true">
        <svg v-if="modalType === 'success'" width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M5 13L9 17L19 7" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <svg v-else-if="modalType === 'danger'" width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" />
        </svg>
        <svg v-else width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M12 8V12" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" />
          <circle cx="12" cy="16" r="1.1" fill="currentColor" />
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
        </svg>
      </div>

      <h3 class="result-modal__title">{{ resolvedTitle }}</h3>
      <p v-if="subtitle" class="result-modal__subtitle">{{ subtitle }}</p>
      <p v-if="desc" class="result-modal__desc">{{ desc }}</p>

      <div v-if="detailRows.length" class="result-modal__info-box">
        <div v-for="row in detailRows" :key="row.label" class="result-modal__info-row">
          <span class="result-modal__info-label">{{ row.label }}</span>
          <span class="result-modal__info-value">{{ row.value }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="result-modal__footer">
        <button class="result-modal__confirm" type="button" @click="emit('close')">
          {{ confirmText }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
:deep(.base-modal__content) {
  width: min(calc(100vw - 36px), 392px);
}

:deep(.base-modal__body) {
  padding: 24px;
}

.result-modal {
  text-align: center;
}

.result-modal__icon {
  display: flex;
  width: 64px;
  height: 64px;
  align-items: center;
  justify-content: center;
  margin: 0 auto 18px;
  border-radius: 999px;
}

.result-modal__icon.is-success {
  background: rgba(20, 174, 92, .14);
  color: var(--color-success);
}

.result-modal__icon.is-danger {
  background: rgba(236, 34, 31, .11);
  color: var(--color-danger);
}

.result-modal__icon.is-warning {
  background: rgba(232, 185, 49, .18);
  color: #8a6a1a;
}

.result-modal__title {
  margin: 0 0 8px;
  color: var(--color-text);
  font-size: 19px;
  font-weight: 800;
  line-height: 1.35;
  letter-spacing: 0;
}

.result-modal__subtitle,
.result-modal__desc {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-line;
}

.result-modal__desc {
  margin-top: 4px;
  font-size: 12px;
}

.result-modal__info-box {
  margin-top: 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  overflow: hidden;
  text-align: left;
}

.result-modal__info-row {
  display: grid;
  grid-template-columns: 86px 1fr;
  gap: 10px;
  min-height: 38px;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-border);
}

.result-modal__info-row:last-child {
  border-bottom: none;
}

.result-modal__info-label {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
}

.result-modal__info-value {
  min-width: 0;
  color: var(--color-text);
  font-size: 13px;
  font-weight: 700;
  text-align: right;
  overflow-wrap: anywhere;
}

.result-modal__footer {
  display: flex;
  justify-content: center;
  width: 100%;
}

.result-modal__confirm {
  min-width: 96px;
  height: 40px;
  padding: 0 22px;
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: #fff;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
</style>
