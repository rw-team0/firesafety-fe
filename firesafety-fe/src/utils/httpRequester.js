import axios from 'axios';

const httpRequester = axios.create({
  baseURL: '/api',
  withCredentials: true, // HttpOnly 쿠키(at, rt)를 요청에 자동으로 실어보냄
});

httpRequester.interceptors.response.use(
  // 성공 응답은 손대지 않고 그대로 통과
  res => res,

  // 실패 응답은 여기서 전부 처리
  async err => {
    if (!err.response) {
      alert('네트워크 오류가 발생했습니다.');
      return Promise.reject(err);
    }

    const { status, data, config } = err.response;

    // RT까지 만료된 경우 (재발급 API 자체가 401) → 로그아웃 처리
    if (config.url === '/auth/reissue' && status === 401) {
      // TODO: 로그인 화면으로 이동 처리
      return Promise.reject(err);
    }

    // AT만 만료된 경우 → 조용히 재발급 후 실패했던 요청을 그대로 재시도
    if (status === 401) {
      await httpRequester.post('/auth/reissue');
      return httpRequester.request(config);
    }

    // 그 외 모든 에러 (400/403/404/409/500 등) → 서버가 보낸 메시지를 그대로 안내
    alert(data.resultMessage ?? '요청 처리 중 오류가 발생했습니다.');
    return Promise.reject(err);
  }
);

export default httpRequester;