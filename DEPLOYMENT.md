# Komexpo Work — Deployment Guide

## Overview

Komexpo Work — это полнофункциональная фриланс-платформа, готовая к развёртыванию на Beget или любом другом хостинге с поддержкой Node.js.

## Requirements

- **Node.js:** 18+ (рекомендуется 20+)
- **npm/pnpm:** последняя версия
- **MySQL:** 5.7+ или MariaDB 10.2+
- **Environment:** Production или Development

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/komexpo-work.git
cd komexpo-work
```

### 2. Install Dependencies

```bash
pnpm install
# или
npm install
```

### 3. Setup Environment Variables

Создайте файл `.env.local` в корне проекта:

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/komexpo_work"

# Authentication
JWT_SECRET="your-jwt-secret-key"

# Owner Info
OWNER_OPEN_ID="your-open-id"
OWNER_NAME="Your Name"

# Forge API (LLM, Storage, Maps)
BUILT_IN_FORGE_API_URL="https://your-forge-api.example.com"
BUILT_IN_FORGE_API_KEY="your-api-key"
VITE_FRONTEND_FORGE_API_URL="https://your-forge-api.example.com"
VITE_FRONTEND_FORGE_API_KEY="your-frontend-key"

# Analytics
VITE_ANALYTICS_ENDPOINT="https://analytics.example.com"
VITE_ANALYTICS_WEBSITE_ID="your-website-id"

# App Info
VITE_APP_TITLE="Komexpo Work"
VITE_APP_LOGO="https://example.com/logo.png"
```

### 4. Setup Database

```bash
# Generate migrations
pnpm drizzle-kit generate

# Apply migrations
pnpm drizzle-kit migrate

# Seed initial data (categories, etc.)
pnpm db:seed
```

### 5. Build

```bash
pnpm build
```

### 6. Start Server

```bash
# Development
pnpm dev

# Production
pnpm start
```

## Deployment on Beget

### Step 1: Prepare Files

```bash
# Build the project
pnpm build

# Create deployment package
tar -czf komexpo-work.tar.gz dist/ node_modules/ package.json pnpm-lock.yaml .env.production
```

### Step 2: Upload to Beget

1. Подключитесь к Beget через FTP/SFTP
2. Загрузите файлы в папку `public_html` или выделенную папку приложения
3. Распакуйте архив

### Step 3: Configure Node.js

В панели управления Beget:

1. Перейдите в **Node.js**
2. Создайте новое приложение
3. Выберите версию Node.js 18+
4. Установите точку входа: `dist/index.js`
5. Установите переменные окружения из `.env.production`
6. Нажмите "Запустить"

### Step 4: Configure Database

1. Создайте базу данных MySQL в панели Beget
2. Обновите `DATABASE_URL` в переменных окружения
3. Запустите миграции через SSH:

```bash
cd /path/to/app
pnpm drizzle-kit migrate
```

### Step 5: Configure SSL

Beget автоматически предоставляет SSL сертификат. Убедитесь, что HTTPS включен в настройках приложения.

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN pnpm build

# Expose port
EXPOSE 3000

# Start
CMD ["pnpm", "start"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: mysql://user:password@db:3306/komexpo_work
      NODE_ENV: production
    depends_on:
      - db

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: komexpo_work
    volumes:
      - db_data:/var/lib/mysql

volumes:
  db_data:
```

## Performance Optimization

### 1. Enable Compression

```typescript
// server/_core/index.ts
import compression from 'compression';
app.use(compression());
```

### 2. Setup Caching

```typescript
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  next();
});
```

### 3. Database Optimization

```sql
-- Add indexes
CREATE INDEX idx_users_openId ON users(openId);
CREATE INDEX idx_kvorki_categoryId ON kvorki(categoryId);
CREATE INDEX idx_kvorki_contractorId ON kvorki(contractorId);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_projects_status ON projects(status);
```

### 4. Enable CDN

Используйте CDN для статических файлов (CSS, JS, изображения).

## Monitoring

### Setup Logging

```typescript
// server/_core/index.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});
```

### Setup Error Tracking

Рекомендуется использовать Sentry или аналогичный сервис:

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

app.use(Sentry.Handlers.errorHandler());
```

## Backup Strategy

### Database Backup

```bash
# Ежедневная автоматическая резервная копия
mysqldump -u user -p database_name > backup_$(date +%Y%m%d).sql

# Восстановление
mysql -u user -p database_name < backup_20260802.sql
```

### File Backup

Используйте S3 или аналогичное хранилище для резервного копирования файлов.

## Security Checklist

- [ ] Установлены все переменные окружения
- [ ] Включен HTTPS
- [ ] Настроены CORS правила
- [ ] Включена JWT аутентификация
- [ ] Установлены rate limits
- [ ] Настроены SQL injection защиты (используется ORM)
- [ ] Включена защита от XSS
- [ ] Настроены регулярные резервные копии
- [ ] Включено логирование ошибок
- [ ] Настроена система мониторинга

## Troubleshooting

### Port Already in Use

```bash
# Найти процесс, использующий порт
lsof -i :3000

# Убить процесс
kill -9 <PID>
```

### Database Connection Error

```bash
# Проверить подключение
mysql -u user -p -h host database_name

# Проверить DATABASE_URL
echo $DATABASE_URL
```

### Build Errors

```bash
# Очистить кэш
rm -rf node_modules .next dist

# Переустановить зависимости
pnpm install

# Пересобрать
pnpm build
```

## Support

Для вопросов и поддержки обращайтесь к документации или откройте issue на GitHub.

## License

MIT License — см. LICENSE файл
