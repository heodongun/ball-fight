# Cloudflare Pages 배포 가이드

Next.js 16 프로젝트를 Cloudflare Pages에 배포하는 완벽한 가이드입니다.

## 목차
- [사전 준비](#사전-준비)
- [Cloudflare Pages 설정](#cloudflare-pages-설정)
- [배포 방법](#배포-방법)
- [환경 변수 설정](#환경-변수-설정)
- [커스텀 도메인 연결](#커스텀-도메인-연결)
- [트러블슈팅](#트러블슈팅)

---

## 사전 준비

### 1. Git 저장소 준비
프로젝트가 Git 저장소에 있어야 합니다 (GitHub, GitLab, Bitbucket).

```bash
# Git 저장소 초기화 (아직 안 했다면)
git init
git add .
git commit -m "Initial commit"

# GitHub에 푸시
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. Next.js 설정 확인

`next.config.js` 또는 `next.config.mjs` 파일을 확인하거나 생성합니다:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Pages에서 Image Optimization을 위한 설정
  images: {
    unoptimized: true, // Cloudflare는 자체 이미지 최적화 제공
  },
}

export default nextConfig
```

### 3. package.json 빌드 스크립트 확인

현재 설정은 이미 올바릅니다:
```json
{
  "scripts": {
    "build": "next build",
    "start": "next start"
  }
}
```

---

## Cloudflare Pages 설정

### 방법 1: Cloudflare Dashboard (권장)

#### 1단계: Cloudflare 계정 생성
1. [Cloudflare](https://dash.cloudflare.com/sign-up) 방문
2. 계정 생성 또는 로그인

#### 2단계: Pages 프로젝트 생성
1. Cloudflare 대시보드에서 **Pages** 클릭
2. **Create a project** 선택
3. **Connect to Git** 선택
4. GitHub/GitLab/Bitbucket 연결 및 권한 승인
5. 배포할 저장소 선택

#### 3단계: 빌드 설정
다음과 같이 설정합니다:

```
Production branch: main (또는 master)
Framework preset: Next.js
Build command: npm run build
Build output directory: .next
Root Directory: (비워둠)
Environment variables: (필요시 추가)
```

**중요한 빌드 설정:**
- **Node.js 버전**: `20` (Environment variables에서 `NODE_VERSION = 20` 설정)
- **Package manager**: `npm` (기본값)

#### 4단계: 배포 시작
**Save and Deploy** 클릭하면 자동으로 빌드 및 배포가 시작됩니다.

---

### 방법 2: Wrangler CLI

#### 1단계: Wrangler 설치
```bash
npm install -g wrangler
# 또는
pnpm add -g wrangler
```

#### 2단계: Cloudflare 인증
```bash
wrangler login
```

#### 3단계: Pages 프로젝트 생성
```bash
# 프로젝트 생성
wrangler pages project create my-v0-project

# 빌드
npm run build

# 배포
wrangler pages deploy .next
```

#### 4단계: GitHub 연동 (선택사항)
```bash
wrangler pages project list
wrangler pages project connect my-v0-project --github-repo YOUR_USERNAME/YOUR_REPO
```

---

## 배포 방법

### 자동 배포 (CD)
Git 저장소에 연결했다면 자동으로 배포됩니다:

1. **프로덕션 배포**: `main` 브랜치에 푸시
   ```bash
   git push origin main
   ```

2. **프리뷰 배포**: 다른 브랜치에 푸시하면 자동으로 프리뷰 URL 생성
   ```bash
   git checkout -b feature/new-feature
   git push origin feature/new-feature
   ```

### 수동 배포
```bash
# 로컬에서 빌드
npm run build

# Wrangler로 배포
wrangler pages deploy .next --project-name=my-v0-project
```

---

## 환경 변수 설정

### Dashboard에서 설정
1. Pages 프로젝트 → **Settings** → **Environment variables**
2. **Add variable** 클릭
3. 변수 추가:
   - `NODE_VERSION`: `20`
   - `NEXT_PUBLIC_API_URL`: `https://api.example.com` (예시)

### Production vs Preview 환경
- **Production**: `main` 브랜치 배포 시 사용
- **Preview**: 다른 브랜치 배포 시 사용

별도로 설정 가능합니다.

### .env 파일 예시
로컬 개발용:
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000/api
DATABASE_URL=your_database_url
```

**주의**: `.env` 파일은 Git에 커밋하지 마세요! `.gitignore`에 추가하세요.

---

## 커스텀 도메인 연결

### 1단계: 도메인 추가
1. Pages 프로젝트 → **Custom domains**
2. **Set up a custom domain** 클릭
3. 도메인 입력 (예: `example.com` 또는 `www.example.com`)

### 2단계: DNS 설정
Cloudflare가 자동으로 DNS 레코드를 추가하거나 수동 설정 안내를 제공합니다.

**CNAME 레코드 예시:**
```
Type: CNAME
Name: www
Target: your-project.pages.dev
```

### 3단계: SSL/TLS 설정
Cloudflare가 자동으로 무료 SSL 인증서를 발급합니다 (Let's Encrypt).

---

## 성능 최적화

### 1. Cloudflare CDN 활용
Cloudflare Pages는 자동으로 전 세계 CDN에 배포됩니다.

### 2. 이미지 최적화
```javascript
// next.config.js
const nextConfig = {
  images: {
    unoptimized: true, // Cloudflare Images 사용 시
    // 또는 Cloudflare Images 통합
    loader: 'custom',
    loaderFile: './cloudflare-image-loader.js',
  },
}
```

### 3. 캐싱 전략
`_headers` 파일을 프로젝트 루트에 생성:
```
# Static assets
/static/*
  Cache-Control: public, max-age=31536000, immutable

# Next.js static files
/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
```

---

## 트러블슈팅

### 문제 1: 빌드 실패 (Node.js 버전)
**해결책**: Environment variables에 `NODE_VERSION = 20` 추가

### 문제 2: 이미지가 로드되지 않음
**해결책**: `next.config.js`에서 `images.unoptimized = true` 설정

### 문제 3: API 라우트가 작동하지 않음
Next.js App Router의 API 라우트는 Cloudflare Pages Functions로 자동 변환됩니다.

**확인사항**:
- `app/api/` 폴더 구조 확인
- Route handlers가 올바른지 확인

### 문제 4: 환경 변수가 적용되지 않음
**해결책**:
- `NEXT_PUBLIC_` 접두사가 있는 변수는 클라이언트에서 사용 가능
- 서버 전용 변수는 접두사 없이 사용
- 변수 추가 후 **재배포** 필요

### 문제 5: 배포 후 404 에러
**해결책**:
- Build output directory가 `.next`로 설정되어 있는지 확인
- `next.config.js`에서 `output: 'standalone'` 제거 (Cloudflare Pages 비호환)

---

## 배포 체크리스트

배포 전 확인사항:

- [ ] Git 저장소에 코드 푸시 완료
- [ ] `next.config.js` 설정 확인
- [ ] 환경 변수 설정 완료
- [ ] Node.js 버전 설정 (`NODE_VERSION = 20`)
- [ ] 빌드 테스트 (`npm run build`)
- [ ] `.gitignore`에 `.env` 파일 추가
- [ ] 이미지 최적화 설정 (`unoptimized: true`)

---

## 추가 리소스

- [Cloudflare Pages 공식 문서](https://developers.cloudflare.com/pages/)
- [Next.js + Cloudflare Pages 가이드](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [Wrangler CLI 문서](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Images 문서](https://developers.cloudflare.com/images/)

---

## 지원 및 문의

문제가 발생하면:
1. [Cloudflare Community](https://community.cloudflare.com/)
2. [Cloudflare Discord](https://discord.cloudflare.com/)
3. Cloudflare Support (유료 플랜)

---

**배포 완료 후 URL**: `https://your-project.pages.dev`

Happy Deploying! 🚀
