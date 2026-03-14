# 구글 로그인 설정 (따라만 하면 됨)

## 1단계: Google Cloud Console

1. https://console.cloud.google.com 접속
2. Google 계정 로그인
3. 상단 **Dayframe** 프로젝트 선택 (이미 있으면 OK)

---

## 2단계: OAuth 동의 화면 (한 번만)

1. 왼쪽 ☰ 메뉴 → **APIs & Services** → **OAuth consent screen**
2. 아직 안 했다면:
   - **External** → **만들기**
   - 앱 이름: `Dayframe`
   - 사용자 지원 이메일: 본인 이메일
   - 개발자 연락처: 본인 이메일
   - **저장 후 계속** 3번 눌러서 완료

---

## 3단계: OAuth 클라이언트 만들기

1. 왼쪽 ☰ 메뉴 → **APIs & Services** → **Credentials**
2. **+ Create Credentials** → **OAuth client ID**
3. Application type: **Web application** 선택
4. Name: `Dayframe Web`

### ⚠️ 여기서 두 군데 다 입력해야 함

**① Authorized JavaScript origins** (도메인만, 경로 X)
- **+ ADD URI** 클릭 후 아래 **둘 다** 추가:
  ```
  https://hurbirlyhcxauipwsnuj.supabase.co
  ```
  ```
  http://localhost:3000
  ```

**② Authorized redirect URIs** (경로 포함)
- **+ ADD URI** 클릭 후 입력:
  ```
  https://hurbirlyhcxauipwsnuj.supabase.co/auth/v1/callback
  ```

5. **만들기** 클릭

---

## 4단계: Client ID & Secret 복사 (중요!)

팝업이 뜨면 **바로 복사**:

- **Your Client ID** → 복사 (끝이 `.apps.googleusercontent.com`)
- **Your Client Secret** → 복사 (영문+숫자)

> 💡 **팝업 닫았거나 Secret 못 봤다면?**  
> Credentials 목록에서 방금 만든 클라이언트 **이름 클릭** → **Client secret** 옆 **Reset secret** → 새 Secret 복사

---

## 5단계: Supabase에 붙여넣기

1. https://supabase.com/dashboard → 프로젝트 선택
2. **Authentication** → **Providers** → **Google**
3. **Enable Sign in with Google** ON
4. **Client ID** 칸에 4단계 Client ID 붙여넣기
5. **Client Secret** 칸에 4단계 Secret 붙여넣기
6. **Save** 클릭

---

## 6단계: Redirect URL 추가

1. **Authentication** → **URL Configuration**
2. **Redirect URLs**에 `http://localhost:3000` 추가
3. **Save** 클릭

---

## 완료

`npm run dev` 실행 후 **Continue with Google** 버튼으로 로그인해 보세요.

---

### 자주 하는 실수

| 잘못된 것 | 올바른 것 |
|----------|----------|
| JavaScript origins에 `/auth/v1/callback` 포함 | 도메인만: `https://hurbirlyhcxauipwsnuj.supabase.co` |
| redirect URIs에 `localhost`만 | `https://hurbirlyhcxauipwsnuj.supabase.co/auth/v1/callback` |
| Secret 안 넣고 Save | Client Secret 꼭 입력 |
