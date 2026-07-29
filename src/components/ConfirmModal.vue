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
    default: '확인하시겠습니까?',
  },
  subtitle: {
    type: String,
    default: '',
  },
  subtitleColor: {
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
  actionLabel: {
    type: String,
    default: '',
  },
  actionText: {
    type: String,
    default: '',
  },
  extraValue: {
    type: String,
    default: '',
  },
  extraLabel: {
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

const displaySubtitle = computed(() => props.subtitle || props.message)
const hasInfo = computed(() => props.itemName || props.itemLabel || props.actionLabel || props.actionText || props.extraValue || props.note)
const resolvedConfirmText = computed(() => {
  if (props.loading) return '처리 중...'
  if (props.confirmText) return props.confirmText
  return modalType.value === 'danger' ? '삭제' : '확인'
})

const subtitleStyle = computed(() => {
  return props.subtitleColor ? { color: props.subtitleColor } : undefined
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
    :hide-header="true"
    :hide-footer="true"
    @close="emit('cancel')"
  >
    <div class="confirm-modal" :class="`is-${modalType}`">
      <div class="confirm-modal__icon" :class="`is-${modalType}`" aria-hidden="true">
        <svg v-if="modalType === 'success'" width="30" height="30" viewBox="0 0 24 24" fill="none">
          <path d="M5 13L9 17L19 7" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <svg v-else-if="modalType === 'danger'" width="30" height="30" viewBox="0 0 24 24" fill="none">
          <path d="M12 7V13" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" />
          <circle cx="12" cy="17" r="1.25" fill="currentColor" />
        </svg>
        <svg v-else width="30" height="30" viewBox="0 0 24 24" fill="none">
          <path d="M12 7V13" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" />
          <circle cx="12" cy="17" r="1.25" fill="currentColor" />
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" opacity=".45" />
        </svg>
      </div>

      <h3 class="confirm-modal__title">{{ title }}</h3>
      <p v-if="displaySubtitle" class="confirm-modal__subtitle" :style="subtitleStyle">
        {{ displaySubtitle }}
      </p>

      <div v-if="hasInfo" class="confirm-modal__info-card" :class="`is-${modalType}`">
        <div v-if="itemName || itemLabel || actionLabel" class="confirm-modal__info-main">
          <span class="confirm-modal__info-icon" :class="`is-${modalType}`" aria-hidden="true">
            <svg v-if="modalType === 'danger'" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M6 7H18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <path d="M9 7V5H15V7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <path d="M9 10V18M15 10V18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              <path d="M7 7L8 20H16L17 7" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
            </svg>
            <svg v-else-if="modalType === 'success'" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 13L9 17L19 7" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 7V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <circle cx="12" cy="17" r="1.1" fill="currentColor" />
            </svg>
          </span>

          <div class="confirm-modal__info-copy">
            <div class="confirm-modal__info-title-row">
              <span v-if="itemLabel" class="confirm-modal__info-label">{{ itemLabel }}</span>
              <strong v-if="itemName" class="confirm-modal__info-title">{{ itemName }}</strong>
              <span v-if="actionLabel" class="confirm-modal__badge" :class="`is-${modalType}`">
                {{ actionLabel }}
              </span>
            </div>
          </div>
        </div>

        <p v-if="actionText || extraValue" class="confirm-modal__info-desc">
          <span v-if="actionText">{{ actionText }}</span>
          <span v-if="actionText && extraValue"> · </span>
          <span v-if="extraValue">
            <template v-if="extraLabel">{{ extraLabel }} </template>{{ extraValue }}
          </span>
        </p>
        <p v-if="note" class="confirm-modal__note">{{ note }}</p>
      </div>

      <slot />

      <div class="confirm-modal__actions">
        <button class="confirm-modal__cancel" type="button" :disabled="loading" @click="emit('cancel')">
          {{ cancelText }}
        </button>
        <button
          class="confirm-modal__confirm"
          type="button"
          :class="`is-${modalType}`"
          :disabled="loading"
          @click="confirm"
        >
          {{ resolvedConfirmText }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
:deep(.base-modal__content) {
  width: min(calc(100vw - 36px), 392px);
}

:deep(.base-modal__body) {
  padding: 24px;
}

.confirm-modal {
  text-align: center;
}

.confirm-modal__icon {
  display: flex;
  width: 68px;
  height: 68px;
  align-items: center;
  justify-content: center;
  margin: 0 auto 18px;
  border-radius: 999px;
}

.confirm-modal__icon.is-primary {
  background: rgba(75, 75, 75, .12);
  color: var(--color-accent);
}

.confirm-modal__icon.is-success {
  background: rgba(20, 174, 92, .14);
  color: var(--color-success);
}

.confirm-modal__icon.is-danger {
  background: rgba(236, 34, 31, .11);
  color: var(--color-danger);
}

.confirm-modal__title {
  margin: 0;
  color: var(--color-text);
  font-size: 20px;
  font-weight: 800;
  line-height: 1.35;
  letter-spacing: 0;
}

.confirm-modal__subtitle {
  margin: 8px 0 0;
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 1.55;
  white-space: pre-line;
}

.confirm-modal__info-card {
  margin-top: 20px;
  padding: 16px;
  border-left: 4px solid var(--color-accent);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  text-align: left;
}

.confirm-modal__info-card.is-success {
  border-left-color: var(--color-success);
  background: rgba(20, 174, 92, .08);
}

.confirm-modal__info-card.is-danger {
  border-left-color: var(--color-danger);
  background: rgba(236, 34, 31, .07);
}

.confirm-modal__info-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.confirm-modal__info-icon {
  display: flex;
  width: 36px;
  height: 36px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
}

.confirm-modal__info-icon.is-primary {
  background: rgba(75, 75, 75, .12);
  color: var(--color-accent);
}

.confirm-modal__info-icon.is-success {
  background: rgba(20, 174, 92, .12);
  color: var(--color-success);
}

.confirm-modal__info-icon.is-danger {
  background: rgba(236, 34, 31, .11);
  color: var(--color-danger);
}

.confirm-modal__info-copy {
  min-width: 0;
  flex: 1;
}

.confirm-modal__info-title-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.confirm-modal__info-label {
  flex: none;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
}

.confirm-modal__info-title {
  min-width: 0;
  color: var(--color-text);
  font-size: 16px;
  font-weight: 800;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.confirm-modal__badge {
  flex: none;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(75, 75, 75, .12);
  color: var(--color-accent);
  font-size: 11px;
  font-weight: 700;
}

.confirm-modal__badge.is-success {
  background: rgba(20, 174, 92, .14);
  color: var(--color-success);
}

.confirm-modal__badge.is-danger {
  background: rgba(236, 34, 31, .12);
  color: var(--color-danger);
}

.confirm-modal__info-desc,
.confirm-modal__note {
  margin: 10px 0 0;
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-line;
}

.confirm-modal__note {
  color: var(--color-danger);
  font-weight: 600;
}

.confirm-modal__actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
}

.confirm-modal__cancel,
.confirm-modal__confirm {
  min-width: 88px;
  height: 40px;
  padding: 0 16px;
  border-radius: var(--radius-md);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.confirm-modal__cancel {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
}

.confirm-modal__cancel:hover {
  background: var(--color-bg);
}

.confirm-modal__confirm {
  border: 1px solid var(--color-accent);
  background: var(--color-accent);
  color: #fff;
}

.confirm-modal__confirm.is-success {
  border-color: var(--color-success);
  background: var(--color-success);
}

.confirm-modal__confirm.is-danger {
  border-color: var(--color-danger);
  background: var(--color-danger);
}

.confirm-modal__cancel:disabled,
.confirm-modal__confirm:disabled {
  opacity: .5;
  cursor: not-allowed;
}
</style>
