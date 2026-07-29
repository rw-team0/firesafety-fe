<template>
  <!-- 공통 카드 틀 -->
  <section class="base-card">
    <header v-if="$slots.header" class="base-card__header">
      <slot name="header" />
    </header>

    <div class="base-card__body">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="base-card__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped>
.base-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-card-bg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.base-card__header,
.base-card__footer {
  padding: var(--space-16) var(--space-20);
}

.base-card__header {
  border-bottom: 1px solid var(--color-border);
}

.base-card__body {
  padding: var(--space-20);
}

.base-card__footer {
  border-top: 1px solid var(--color-border);
  background: var(--color-page-bg);
}

@media (max-width: 640px) {
  .base-card__header,
  .base-card__body,
  .base-card__footer {
    padding: var(--space-16);
  }
}
</style>
