import { defineStore } from 'pinia'
import { ref } from 'vue'

// alert()/confirm() 같은 브라우저 기본 팝업 금지 컨벤션 때문에 만든 전역 알림 모달 상태.
// httpRequester.js처럼 컴포넌트가 아닌 곳(axios 인터셉터)에서도 모달을 띄우려면
// Pinia 스토어를 거쳐야 해서 이렇게 분리함. 실제 렌더링은 components/AlertModal.vue(App.vue에 상시 마운트)가 담당.
export const useUiAlertStore = defineStore('uiAlert', () => {
  const message = ref(null)

  function show(msg) { message.value = msg }
  function close() { message.value = null }

  return { message, show, close }
})
