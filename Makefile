# ─── stardive-fan-site Makefile ───

# 로컬 개발
dev:
	pnpm dev

dev-web:
	pnpm --filter @stardive/web dev

dev-api:
	pnpm --filter @stardive/api dev

install:
	pnpm install

typecheck:
	pnpm typecheck

build:
	pnpm build

test:
	pnpm test

# DB (로컬 → 서버 DB 연결, .env 필요)
db-push:
	pnpm --filter @stardive/db push

db-seed:
	pnpm --filter @stardive/db seed

db-verify:
	pnpm --filter @stardive/db seed:verify

db-studio:
	pnpm --filter @stardive/db studio

db-init:
	ssh apitots@45.250.223.195 'docker exec -i postgres-db psql -U apitots -d postgres < ~/workspace/stardive-fan-site/packages/db/init/00-create-db.sql'

# 서버 배포
SERVER=apitots@45.250.223.195
REMOTE_DIR=~/workspace/stardive-fan-site

deploy:
	ssh $(SERVER) 'cd $(REMOTE_DIR) && git pull origin main && cd infra && docker compose up -d --build mongil-web mongil-api'

deploy-web:
	ssh $(SERVER) 'cd $(REMOTE_DIR) && git pull origin main && cd infra && docker compose up -d --build mongil-web'

deploy-api:
	ssh $(SERVER) 'cd $(REMOTE_DIR) && git pull origin main && cd infra && docker compose up -d --build mongil-api'

deploy-quick:
	git push origin main
	ssh $(SERVER) 'cd $(REMOTE_DIR) && git pull origin main && cd infra && docker compose up -d --build mongil-web mongil-api'

# 서버 상태
status:
	ssh $(SERVER) 'docker ps --format "table {{.Names}}\t{{.Status}}" | grep mongil'

logs-web:
	ssh $(SERVER) 'docker logs mongil-web --tail 30'

logs-api:
	ssh $(SERVER) 'docker logs mongil-api --tail 30'

health:
	@echo "=== API ===" && curl -fs https://mongil-api.peo.kr/healthz && echo "" && echo "=== WEB ===" && curl -fs https://mongil.peo.kr/healthz && echo ""

# 캐디 리로드
caddy-reload:
	ssh $(SERVER) 'docker exec caddy-proxy caddy reload --config /etc/caddy/Caddyfile'

# 정리
clean:
	ssh $(SERVER) 'cd $(REMOTE_DIR)/infra && docker compose down && docker image prune -f'

.PHONY: dev dev-web dev-api install typecheck build test db-push db-seed db-verify db-studio db-init deploy deploy-web deploy-api deploy-quick status logs-web logs-api health caddy-reload clean
