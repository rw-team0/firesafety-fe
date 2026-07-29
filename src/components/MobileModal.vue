<script setup>
import { computed, ref, toRef } from 'vue'
import { useModalA11y } from '../composables/useModalA11y'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    default: 'primary',
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
  confirmText: {
    type: String,
    default: '확인',
  },
  cancelText: {
    type: String,
    default: '취소',
  },
  confirmType: {
    type: String,
    default: 'primary',
  },
  showCancel: {
    type: Boolean,
    default: true,
  },
  infoRows: {
    type: Array,
    default: () => [],
  },
  noteText: {
    type: String,
    default: '',
  },
  closeOnOverlay: {
    type: Boolean,
    default: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['confirm', 'cancel', 'close'])
const sheetRef = ref(null)

const modalType = computed(() => {
  if (props.type === 'danger') return 'danger'
  if (props.type === 'success') return 'success'
  if (props.type === 'warning') return 'warning'
  return 'primary'
})

const resolvedSubtitle = computed(() => props.subtitle || props.message)
const buttonType = computed(() => props.confirmType === 'danger' || modalType.value === 'danger' ? 'danger' : 'primary')

function requestClose() {
  emit('cancel')
  emit('close')
}

function confirm() {
  if (!props.loading) {
    emit('confirm')
  }
}

function handleOverlayClick() {
  if (props.closeOnOverlay) {
    requestClose()
  }
}

useModalA11y({
  visible: toRef(props, 'visible'),
  containerRef: sheetRef,
  onClose: requestClose,
})
</script>

<template>
  <Teleport to="body">
    <Transition name="mobile-sheet">
      <div v-if="visible" class="mobile-modal">
        <div class="mobile-modal__overlay" @click="handleOverlayClick" />

        <section
          ref="sheetRef"
          class="mobile-modal__sheet"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
        >
          <div class="mobile-modal__handle" aria-hidden="true" />

          <div class="mobile-modal__icon" :class="`is-${modalType}`" aria-hidden="true">
            <svg v-if="modalType === 'success'" width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M5 13L9 17L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <svg v-else-if="modalType === 'primary'" width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
              <path d="M12 11V16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
              <circle cx="12" cy="8" r="1.1" fill="currentColor" />
            </svg>
            <svg v-else width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 8V12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
              <circle cx="12" cy="16" r="1.1" fill="currentColor" />
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
            </svg>
          </div>

          <h2 class="mobile-modal__title">{{ title }}</h2>
          <p v-if="resolvedSubtitle" class="mobile-modal__subtitle">{{ resolvedSubtitle }}</p>

          <slot />

          <div v-if="infoRows.length" class="mobile-modal__info">
            <div
              v-for="row in infoRows"
              :key="row.label"
              class="mobile-modal__info-row"
              :class="{ 'is-highlight': row.highlight }"
            >
              <span class="mobile-modal__info-label">{{ row.label }}</span>
              <span class="mobile-modal__info-value">{{ row.value }}</span>
            </div>
          </div>

          <p v-if="noteText" class="mobile-modal__note">{{ noteText }}</p>

          <button
            class="mobile-modal__confirm"
            :class="`is-${buttonType}`"
            type="button"
            :disabled="loading"
            @click="confirm"
          >
            {{ loading ? '처리 중...' : confirmText }}
          </button>
          <button v-if="showCancel" class="mobile-modal__cancel" type="button" :disabled="loading" @click="requestClose">
            {{ cancelText }}
          </button>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.mobile-modal {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal-overlay);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.mobile-modal__overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, .38);
}

.mobile-modal__sheet {
  position: relative;
  z-index: var(--z-modal);
  display: flex;
  width: 100%;
  max-width: 480px;
  max-height: calc(100vh - 28px);
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 24px 34px;
  background: var(--color-surface);
  border-radius: 20px 20px 0 0;
  box-sizing: border-box;
  overflow-y: auto;
  box-shadow: 0 -18px 42px rgba(0, 0, 0, .18);
}

.mobile-modal__sheet:focus {
  outline: none;
}

.mobile-modal__handle {
  width: 36px;
  height: 4px;
  margin-bottom: 8px;
  border-radius: 999px;
  background: var(--color-border);
}

.mobile-modal__icon {
  display: flex;
  width: 64px;
  height: 64px;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
  border-radius: 999px;
}

.mobile-modal__icon.is-primary {
  background: rgba(75, 75, 75, .12);
  color: var(--color-accent);
}

.mobile-modal__icon.is-success {
  background: rgba(20, 174, 92, .14);
  color: var(--color-success);
}

.mobile-modal__icon.is-warning {
  background: rgba(232, 185, 49, .18);
  color: #8a6a1a;
}

.mobile-modal__icon.is-danger {
  background: rgba(236, 34, 31, .11);
  color: var(--color-danger);
}

.mobile-modal__title {
  margin: 0;
  color: var(--color-text);
  font-size: 18px;
  font-weight: 800;
  line-height: 1.35;
  letter-spacing: 0;
  text-align: center;
}

.mobile-modal__subtitle {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.6;
  text-align: center;
  white-space: pre-line;
}

.mobile-modal__info {
  width: 100%;
  margin-top: 8px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
}

.mobile-modal__info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--color-border);
}

.mobile-modal__info-row:last-child {
  border-bottom: none;
}

.mobile-modal__info-row.is-highlight {
  align-items: flex-start;
  flex-direction: column;
  gap: 4px;
  background: var(--color-bg);
}

.mobile-modal__info-label {
  flex: none;
  color: var(--color-text-muted);
  font-size: 13px;
}

.mobile-modal__info-value {
  min-width: 0;
  color: var(--color-text);
  font-size: 13px;
  font-weight: 700;
  text-align: right;
  overflow-wrap: anywhere;
}

.mobile-modal__info-row.is-highlight .mobile-modal__info-value {
  text-align: left;
}

.mobile-modal__note {
  margin: 0;
  color: var(--color-danger);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
  text-align: center;
  white-space: pre-line;
}

.mobile-modal__confirm,
.mobile-modal__cancel {
  width: 100%;
  border-radius: 12px;
  font: inherit;
  cursor: pointer;
}

.mobile-modal__confirm {
  height: 52px;
  margin-top: 8px;
  border: none;
  color: #fff;
  font-size: 15px;
  font-weight: 800;
}

.mobile-modal__confirm.is-primary {
  background: var(--color-accent);
}

.mobile-modal__confirm.is-danger {
  background: var(--color-danger);
}

.mobile-modal__cancel {
  height: 44px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-muted);
  font-size: 14px;
  font-weight: 700;
}

.mobile-modal__confirm:disabled,
.mobile-modal__cancel:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.mobile-sheet-enter-active,
.mobile-sheet-leave-active {
  transition: opacity .22s ease;
}

.mobile-sheet-enter-active .mobile-modal__sheet,
.mobile-sheet-leave-active .mobile-modal__sheet {
  transition: transform .28s cubic-bezier(.32, .72, 0, 1);
}

.mobile-sheet-enter-from,
.mobile-sheet-leave-to {
  opacity: 0;
}

.mobile-sheet-enter-from .mobile-modal__sheet,
.mobile-sheet-leave-to .mobile-modal__sheet {
  transform: translateY(100%);
}
</style>
