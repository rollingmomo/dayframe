# Supabase 로그인 설정

## 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) 접속 후 로그인
2. **New Project** 클릭
3. 프로젝트 이름, 비밀번호, 리전 설정 후 생성

## 2. 데이터베이스 테이블 생성

Supabase 대시보드 → **SQL Editor** → **New query** 에서 아래 SQL 실행:

```sql
-- Planner data per user
CREATE TABLE IF NOT EXISTS planner_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tasks JSONB DEFAULT '[]',
  schedule JSONB DEFAULT '[]',
  categories JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE planner_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own planner_data"
  ON planner_data FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own planner_data"
  ON planner_data FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own planner_data"
  ON planner_data FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own planner_data"
  ON planner_data FOR DELETE USING (auth.uid() = user_id);
```

## 3. 환경 변수 설정

Supabase 대시보드 → **Settings** → **API** 에서:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** key → `VITE_SUPABASE_ANON_KEY`

프로젝트 루트에 `.env` 파일 생성:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 4. "Invalid API key" 오류 해결

회원가입/로그인 시 **Invalid API key**가 뜨면:

1. **프로젝트 일시중지 확인**  
   무료 플랜은 7일 미사용 시 자동 일시중지됩니다. Supabase 대시보드 → 프로젝트 선택 → **Restore project** 클릭.

2. **API 키 재확인**  
   **Settings** → **API** → **Project API keys**에서 **anon public** 키를 복사해 `.env`의 `VITE_SUPABASE_ANON_KEY`에 붙여넣기. (앞뒤 공백/따옴표 없이)

3. **개발 서버 재시작**  
   `.env` 수정 후 `npm run dev`를 다시 실행.

## 5. 이메일 인증 (선택)

Supabase 기본값은 이메일 인증이 필요합니다. 개발 중에는 **Authentication** → **Providers** → **Email** 에서 "Confirm email" 비활성화 가능.

---

## 6. 구글 로그인 (선택)

### Supabase 설정

1. **Authentication** → **Providers** → **Google** 클릭
2. **Enable Sign in with Google** 켜기

### Google Cloud Console 설정

1. [console.cloud.google.com](https://console.cloud.google.com) 접속
2. 프로젝트 선택 또는 새로 만들기
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
4. Application type: **Web application**
5. **Authorized redirect URIs** 에 추가:
   ```
   https://hurbirlyhcxauipwsnuj.supabase.co/auth/v1/callback
   ```
6. **Client ID**와 **Client Secret** 복사

### Supabase에 입력

1. Supabase **Authentication** → **Providers** → **Google**
2. **Client ID**, **Client Secret** 붙여넣기
3. **Save**

### Redirect URL 추가 (필수)

**Authentication** → **URL Configuration** → **Redirect URLs** 에 아래 **둘 다** 추가:
```
http://localhost:3000
http://localhost:3000/
```
> 앱이 다른 주소에서 실행 중이면 그 주소도 추가 (예: `http://127.0.0.1:3000`)
