<script setup>
import { computed, ref, toRef } from 'vue'
import { useModalA11y } from '../../composables/useModalA11y'

const props = defineProps({
  visible: {
    type: Boolean,
    default: true,
  },
  title: {
    type: String,
    default: 'Modal Title',
  },
  subtitle: {
    type: String,
    default: '',
  },
  hideHeader: {
    type: Boolean,
    default: false,
  },
  hideFooter: {
    type: Boolean,
    default: false,
  },
  closeOnOverlay: {
    type: Boolean,
    default: true,
  },
  maxWidth: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['close'])
const modalRef = ref(null)
const contentStyle = computed(() => props.maxWidth ? { width: `min(100%, ${props.maxWidth})` } : undefined)

function closeModal() {
  emit('close')
}

function handleOverlayClick() {
  if (props.closeOnOverlay) {
    closeModal()
  }
}

useModalA11y({
  visible: toRef(props, 'visible'),
  containerRef: modalRef,
  onClose: closeModal,
})
</script>

<template>
  <div v-if="visible" class="base-modal">
    <div class="base-modal__overlay" @click="handleOverlayClick" />
    <section
      ref="modalRef"
      class="base-modal__content"
      :style="contentStyle"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      tabindex="-1"
    >
      <template v-if="!hideHeader">
        <slot name="header">
          <div class="base-modal__header">
            <div class="base-modal__header-copy">
              <strong class="base-modal__title">{{ title }}</strong>
              <p v-if="subtitle" class="base-modal__subtitle">{{ subtitle }}</p>
            </div>
            <button type="button" class="base-modal__close" aria-label="닫기" @click="closeModal">×</button>
          </div>
        </slot>
      </template>

      <slot name="body">
        <div class="base-modal__body">
          <slot>Modal Content</slot>
        </div>
      </slot>

      <template v-if="!hideFooter">
        <slot name="footer">
          <div class="base-modal__footer">
            <button type="button" class="btn btn-primary" @click="closeModal">확인</button>
          </div>
        </slot>
      </template>
    </section>
  </div>
</template>

<style scoped>
.base-modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
}

.base-modal__overlay {
  position: absolute;
  inset: 0;
  z-index: var(--z-modal-overlay);
  background: rgba(0, 0, 0, .5);
}

.base-modal__content {
  position: relative;
  z-index: var(--z-modal);
  width: 360px;
  max-width: 100%;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 18px 42px rgba(0, 0, 0, .18);
}

.base-modal__content:focus {
  outline: none;
}

.base-modal__header {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 40px 14px 18px;
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border);
}

.base-modal__header-copy {
  min-width: 0;
}

.base-modal__title {
  display: block;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
}

.base-modal__subtitle {
  margin: 4px 0 0;
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.base-modal__close {
  position: absolute;
  top: 8px;
  right: 10px;
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  color: inherit;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  border-radius: var(--radius-md);
}

.base-modal__close:hover {
  background: rgba(0, 0, 0, .08);
}

.base-modal__body {
  padding: 18px;
}

.base-modal__footer {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 0 18px 18px;
}
</style>
