<script setup>
// PanelListView.vue 안에서
import httpRequester from '@/utils/httpRequester';

async function getPanels() {
  const res = await httpRequester.get('/panels');
  return res.data.resultData;
  // 401(AT만료) 재발급도, 에러 알림도 전부 인터셉터가 알아서 처리함
  // 그래서 이 함수엔 try/catch조차 필요 없음
}
</script>