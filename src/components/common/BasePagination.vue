<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentPage: {
    type: Number,
    required: true,
  },
  totalPages: {
    type: Number,
    required: true,
  },
  totalItems: {
    type: Number,
    default: 0,
  },
  pageWindow: {
    type: Number,
    default: 10,
  },
  unit: {
    type: String,
    default: '건',
  },
  showSummary: {
    type: Boolean,
    default: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['change'])

const pageCount = computed(() => Math.max(1, Number(props.totalPages) || 0))
const windowSize = computed(() => Math.max(1, Number(props.pageWindow) || 10))
const current = computed(() => {
  const rawPage = Number(props.currentPage) || 0
  return Math.min(Math.max(0, rawPage), pageCount.value - 1)
})
const pageNumbers = computed(() => {
  const start = Math.floor(current.value / windowSize.value) * windowSize.value
  const end = Math.min(start + windowSize.value, pageCount.value)
  return Array.from({ length: end - start }, (_, index) => start + index)
})

const isFirstPage = computed(() => current.value <= 0)
const isLastPage = computed(() => current.value >= pageCount.value - 1)

function changePage(nextPage) {
  const normalized = Number(nextPage)
  if (!Number.isFinite(normalized)) return
  if (props.disabled) return
  if (normalized < 0 || normalized >= pageCount.value) return
  if (normalized === current.value) return
  emit('change', normalized)
}
</script>

<template>
  <div class="base-pagination">
    <p v-if="showSummary" class="base-pagination__summary">
      총 <strong>{{ totalItems }}</strong>{{ unit }}
    </p>

    <nav class="base-pagination__nav" aria-label="페이지 이동">
      <button
        type="button"
        class="base-pagination__button"
        :disabled="disabled || isFirstPage"
        aria-label="처음 페이지로 이동"
        @click="changePage(0)"
      >
        &laquo;
      </button>
      <button
        type="button"
        class="base-pagination__button"
        :disabled="disabled || isFirstPage"
        aria-label="이전 페이지로 이동"
        @click="changePage(current - 1)"
      >
        &lsaquo;
      </button>

      <div class="base-pagination__pages">
        <button
          v-for="page in pageNumbers"
          :key="page"
          type="button"
          class="base-pagination__page"
          :class="{ 'is-active': page === current }"
          :disabled="disabled"
          :aria-label="`${page + 1}페이지로 이동`"
          :aria-current="page === current ? 'page' : undefined"
          @click="changePage(page)"
        >
          {{ page + 1 }}
        </button>
      </div>

      <button
        type="button"
        class="base-pagination__button"
        :disabled="disabled || isLastPage"
        aria-label="다음 페이지로 이동"
        @click="changePage(current + 1)"
      >
        &rsaquo;
      </button>
      <button
        type="button"
        class="base-pagination__button"
        :disabled="disabled || isLastPage"
        aria-label="마지막 페이지로 이동"
        @click="changePage(pageCount - 1)"
      >
        &raquo;
      </button>
    </nav>
  </div>
</template>

<style scoped>
.base-pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  margin-top: 10px;
}

.base-pagination__summary {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 12px;
}

.base-pagination__summary strong {
  color: var(--color-text);
  font-weight: 700;
}

.base-pagination__nav {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.base-pagination__pages {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
}

.base-pagination__button,
.base-pagination__page {
  display: inline-flex;
  min-width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.base-pagination__button:hover:not(:disabled),
.base-pagination__page:hover:not(:disabled) {
  border-color: var(--color-accent);
  background: rgba(75, 75, 75, .06);
}

.base-pagination__button:focus-visible,
.base-pagination__page:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.base-pagination__page.is-active {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: #fff;
}

.base-pagination__button:disabled,
.base-pagination__page:disabled {
  cursor: not-allowed;
  opacity: .5;
}

@media (max-width: 640px) {
  .base-pagination {
    flex-direction: column;
    align-items: stretch;
  }

  .base-pagination__summary {
    text-align: center;
  }

  .base-pagination__nav,
  .base-pagination__pages {
    flex-wrap: wrap;
  }
}
</style>
