# firesafety-fe 프론트엔드 이미지. Vite 빌드 후 nginx로 정적 파일만 서빙하는 멀티스테이지 빌드.
#
# node:20 대신 22를 쓰는 이유: package.json의 "engines": "^22.18.0 || >=24.12.0" 요건 때문
# (vite 8 자체는 20.19+에서도 동작하지만, 이 프로젝트가 지정한 최소 버전을 따른다).
#
# 회사 물리서버(x86_64)에서 그대로 빌드해서 쓸 경우 --platform 옵션은 필요 없다.
# 개발 Mac(Apple Silicon)에서 이미지를 만들어 옮길 때만
# `docker buildx build --platform linux/amd64 ...`로 빌드할 것.

# 1단계: Vite 빌드
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# 2단계: 정적 파일 서빙
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
