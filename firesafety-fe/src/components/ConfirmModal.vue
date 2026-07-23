<script setup>
defineProps({ title: String, message: String, danger: { type: Boolean, default: false } })
const emit = defineEmits(['confirm', 'cancel'])
</script>
<template>
  <div class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal-panel">
      <div class="modal-header" :class="{ danger }">{{ title }}</div>
      <div class="modal-body">
        <p>{{ message }}</p>
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
