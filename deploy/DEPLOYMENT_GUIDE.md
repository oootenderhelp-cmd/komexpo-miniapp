# Руководство по деплою — Тендровик AI на Beget VPS (comx.ru)

## Требования к серверу

- Ubuntu 22.04+ (Beget VPS)
- Минимум 2 vCPU, 2 GB RAM, 20 GB SSD
- Docker Engine 24+ и Docker Compose v2
- Nginx (для reverse proxy + SSL)
- Домен comx.ru (DNS пока НЕ переключаем)

---

## Шаг 0: Подготовка сервера

```bash
# Обновить систему
apt update && apt upgrade -y

# Установить Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker

# Установить Nginx
apt install -y nginx
systemctl enable nginx

# Создать директории
mkdir -p /opt/tendrovik
mkdir -p /var/www/comx.ru/static
mkdir -p /var/backups/tendrovik
```

---

## Шаг 1: Клонировать репозиторий

```bash
cd /opt
git clone https://github.com/oootenderhelp-cmd/komexpo-miniapp.git tendrovik
cd tendrovik
git checkout claude/tendrovick-backend-foundation-c30mbs
```

---

## Шаг 2: Настроить переменные окружения

```bash
cd /opt/tendrovik/deploy
cp .env.production.example .env

# Сгенерировать секреты
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)" >> .env
echo "JWT_SECRET=$(openssl rand -base64 48)" >> .env

# Проверить .env
cat .env
```

---

## Шаг 3: Поместить статику

```bash
cp /opt/tendrovik/index.html /var/www/comx.ru/static/index.html
```

---

## Шаг 4: Собрать и запустить

```bash
cd /opt/tendrovik/deploy
docker compose up -d --build

# Проверить контейнеры
docker compose ps
docker compose logs backend --tail 50

# Проверить PostgreSQL
docker exec komexpo-miniapp-db-1 psql -U tendrovik -c '\dt'
```

---

## Шаг 5: Настроить Nginx (без SSL — для проверки)

```bash
# Временный конфиг для проверки по IP
cat > /etc/nginx/sites-available/tendrovik-test <<'NGINX'
server {
    listen 80 default_server;
    
    root /var/www/comx.ru/static;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /v1/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/tendrovik-test /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### Проверить по IP сервера:

```bash
# Статика
curl -s http://<IP_СЕРВЕРА>/ | head -5

# API (пока 404/502 — сервер ещё не обслуживает /v1/)
curl -s http://<IP_СЕРВЕРА>/v1/health
```

---

## Шаг 6: Проверить IP, затем SSL

**Только после подтверждения что HTTP по IP работает:**

```bash
# 1. Переключить DNS: A-запись comx.ru → IP сервера
# 2. Подождать распространения DNS (5-15 мин)
# 3. Проверить:
dig comx.ru A
ping comx.ru

# 4. Получить SSL-сертификат:
chmod +x /opt/tendrovik/deploy/scripts/setup-ssl.sh
/opt/tendrovik/deploy/scripts/setup-ssl.sh your@email.com

# 5. Подключить production nginx конфиг:
cp /opt/tendrovik/deploy/nginx/comx.ru.conf /etc/nginx/sites-available/comx.ru
ln -sf /etc/nginx/sites-available/comx.ru /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/tendrovik-test
nginx -t && systemctl reload nginx

# 6. Проверить HTTPS:
curl -I https://comx.ru/
```

---

## Шаг 7: Настроить бэкапы

```bash
chmod +x /opt/tendrovik/deploy/scripts/backup.sh

# Установить systemd-таймеры
cp /opt/tendrovik/deploy/systemd/tendrovik-backup.service /etc/systemd/system/
cp /opt/tendrovik/deploy/systemd/tendrovik-backup.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now tendrovik-backup.timer

# Проверить:
systemctl list-timers | grep tendrovik
/opt/tendrovik/deploy/scripts/backup.sh  # ручной тест
ls -la /var/backups/tendrovik/
```

---

## Шаг 8: Автозапуск при перезагрузке

```bash
cp /opt/tendrovik/deploy/systemd/tendrovik.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable tendrovik
```

---

## Обновление

```bash
cd /opt/tendrovik
git pull origin claude/tendrovick-backend-foundation-c30mbs
cd deploy
docker compose up -d --build
docker compose logs backend --tail 20
```

---

## Файловое хранилище

Загруженные документы хранятся в Docker volume `uploads`, смонтированном в `/app/data/uploads`.
На хосте доступ через:

```bash
docker volume inspect komexpo-miniapp_uploads
# Mountpoint → /var/lib/docker/volumes/komexpo-miniapp_uploads/_data
```

Права: только контейнер backend (uid 1001). Nginx проксирует upload через `/v1/documents/upload` с лимитом 100 MB.

---

## Известные блокеры

| # | Блокер | Что нужно | Кто делает |
|---|--------|-----------|------------|
| 1 | **Нет HTTP-сервера** | Подключить Hono/Express к `src/index.ts`, добавить `listen()` | Codex |
| 2 | **Нет API-роутов** | Реализовать `/v1/health`, `/v1/tenders`, и остальные 22 endpoint | Codex |
| 3 | **Auth не подключён к HTTP** | Подключить `tendrovik-auth-rbac` как middleware | Codex |
| 4 | **Нет upload handler** | Реализовать multipart upload в `/v1/documents/upload` | Codex |
| 5 | **DNS не переключён** | A-запись comx.ru → IP сервера Beget | Вручную |

Инфраструктура (Docker, Nginx, SSL, backup, systemd) готова.
Ожидаем HTTP-сервер от Codex для полноценного запуска.
