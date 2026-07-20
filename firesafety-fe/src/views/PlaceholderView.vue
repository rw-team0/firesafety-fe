<script setup>
import { useRoute } from 'vue-router'
const route = useRoute()
</script>

<template>
  <div style="padding:40px;">
    <h2>{{ route.name }}</h2>
    <p style="color:#888;">경로: {{ route.path }}</p>
    <p style="color:#888;">아직 구현 전 (플레이스홀더)</p>
  </div>
</template>