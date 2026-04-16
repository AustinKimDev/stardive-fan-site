-- stardive-fan-site DB 초기화
-- 실행: docker exec -i postgres-db psql -U postgres < packages/db/init/00-create-db.sql

-- 유저 생성 (이미 있으면 무시)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'stardive') THEN
    CREATE ROLE stardive WITH LOGIN PASSWORD 'stardive_2026!';
  END IF;
END
$$;

-- DB 생성 (이미 있으면 무시)
SELECT 'CREATE DATABASE stardive OWNER stardive'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'stardive')\gexec

-- 권한
GRANT ALL PRIVILEGES ON DATABASE stardive TO stardive;

-- stardive DB에 접속해서 스키마 권한 부여
\c stardive
GRANT ALL ON SCHEMA public TO stardive;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO stardive;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO stardive;
