<script setup>
defineProps({ title: String, message: String, danger: { type: Boolean, default: false } })
const emit = defineEmits(['confirm', 'cancel'])
</script>
<template>
  <div style="position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:100;" @click.self="$emit('cancel')">
    <div style="width:360px;background:#16223A;border-radius:10px;overflow:hidden;">
      <div :style="{background: danger ? '#EF4B54' : '#22D3C5', color:'#fff', padding:'12px 18px', fontWeight:700}">{{ title }}</div>
      <div style="padding:18px;">
        <p style="color:#93A1BE;font-size:12.5px;">{{ message }}</p>
        <div style="display:flex;justify-content:flex-end;gap:8px;">
          <button @click="$emit('cancel')">취소</button>
          <button @click="$emit('confirm')" :style="{background: danger ? '#EF4B54' : '#22D3C5'}">{{ danger ? '삭제' : '확인' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>