<script setup>
defineProps({ title: String, message: String, note: { type: String, default: '' }, danger: { type: Boolean, default: false } })
const emit = defineEmits(['confirm', 'cancel'])
</script>
<template>
  <div class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal-panel">
      <div class="modal-header" :class="{ danger }">{{ title }}</div>
      <div class="modal-body">
        <p :style="{ color: 'var(--color-text)', margin: note ? '0 0 6px' : '0 0 16px' }">{{ message }}</p>
        <p v-if="note" style="margin:0 0 16px;">{{ note }}</p>
        <div class="modal-actions">
          <button class="btn" :class="danger ? 'btn-danger' : 'btn-primary'" @click="$emit('confirm')">
            {{ danger ? '삭제' : '확인' }}
          </button>
          <button class="btn" @click="$emit('cancel')">취소</button>
        </div>
      </div>
    </div>
  </div>
</template>
