<script setup>
import { computed } from 'vue'

// 상태 뱃지 색
const props = defineProps({
  status: {
    type: String,
    default: '',
  },
  variant: {
    type: String,
    default: 'neutral',
  },
})

const STATUS_VARIANT = {
  NORMAL: 'success',
  CAUTION: 'warning',
  RISK: 'danger',
  UNCONFIRMED: 'danger',
  CONFIRMED: 'warning',
  RESOLVED: 'success',
  OFFLINE: 'neutral',
}

// status 우선
const badgeVariant = computed(() => {
  return STATUS_VARIANT[props.status] || props.variant || 'neutral'
})
</script>

<template>
  <span class="status-badge" :class="`is-${badgeVariant}`">
    <slot />
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  min-height: 22px;
  align-items: center;
  justify-content: center;
  padding: 3px var(--space-8);
  border-radius: 999px;
  font-size: var(--font-size-caption);
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
}

.status-badge.is-success {
  background: rgba(20, 174, 92, .13);
  color: var(--color-success);
}

.status-badge.is-warning {
  background: rgba(232, 155, 49, .16);
  color: #8a5a13;
}

.status-badge.is-danger {
  background: rgba(236, 34, 31, .12);
  color: var(--color-danger);
}

.status-badge.is-neutral {
  background: var(--color-page-bg);
  color: var(--color-text-secondary);
}

.status-badge.is-info {
  background: rgba(63, 71, 79, .12);
  color: var(--color-action-primary);
}
</style>
