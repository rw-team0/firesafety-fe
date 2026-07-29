<script setup>
// 페이지 상단
defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <header class="page-header">
    <div class="page-header__copy">
      <h2 class="page-header__title">{{ title }}</h2>
      <p v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
    </div>

    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-16);
  margin-bottom: var(--space-20);
}

.page-header__copy {
  min-width: 0;
}

.page-header__title {
  margin: 0;
  color: var(--color-text-primary);
  font-size: var(--font-size-title);
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: 0;
}

.page-header__subtitle {
  margin: var(--space-4) 0 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-subtitle);
  line-height: 1.5;
}

.page-header__actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--space-8);
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
  }

  .page-header__actions {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
