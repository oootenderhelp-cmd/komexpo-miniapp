# Komexpo Work - Project TODO

## Database & Schema
- [x] Extended user profiles (roles, contractor status, avatar, bio)
- [x] Categories table
- [x] Kvorki (gigs/services) table
- [x] Projects (job board) table
- [x] Project responses table
- [x] Orders table with escrow logic
- [x] Order milestones table
- [x] Transactions/payments table
- [x] Reviews table
- [x] Chat messages table
- [x] Favorites table
- [x] Notifications table
- [x] Ad banners table
- [x] Ad campaigns table
- [x] Disputes table

## Backend API (tRPC Routers)
- [x] User profile management router
- [x] Categories router
- [x] Kvorki CRUD router
- [x] Projects CRUD router
- [x] Project responses router
- [x] Orders router with escrow
- [x] Milestones router
- [x] Transactions router
- [x] Reviews router
- [x] Chat router
- [x] Favorites router
- [x] Notifications router
- [x] Admin router (user management, moderation, disputes)
- [x] Owner dashboard router (statistics)
- [x] Advertising router

## Frontend - Public Pages
- [x] Landing page (hero, features, categories)
- [x] Service catalog with search and filters
- [x] Kvorka detail page
- [x] Contractor profile page with portfolio
- [x] Project exchange (job board) page
- [x] Project detail page
- [x] Registration/login flow with role selection

## Frontend - Customer Dashboard
- [x] My orders page
- [x] My projects page
- [x] Balance & transactions page
- [x] Favorites page
- [x] Chat/messages page

## Frontend - Contractor Dashboard
- [x] My kvorki management page
- [x] Incoming orders page
- [x] Job board responses page
- [x] Balance & withdrawal page
- [x] Portfolio management

## Frontend - Admin Panel
- [x] User management page
- [x] Content moderation page
- [x] Disputes review page

## Frontend - Owner Dashboard
- [x] Platform statistics (turnover, commissions, users, orders)
- [x] Access and role management

## Frontend - Advertising Cabinet
- [x] Banner management page
- [x] Ad campaign creation and management
- [x] Ad placement across platform

## System Features
- [x] Escrow with 20% commission
- [x] Milestone-based payments
- [x] Dispute arbitration
- [x] Fund withdrawal system
- [x] Balance top-up system

## Testing
- [x] Auth logout test
- [x] Platform integration tests (16 tests passing)


## Phase 2 - Detailed Requirements Implementation

### Commission & Financial
- [ ] Change commission from 20% to 15%
- [ ] Implement fund holding (escrow) until work acceptance
- [ ] Internal user balance system

### Verification System
- [ ] SMS verification (stub)
- [ ] Tinkoff ID verification (stub)
- [ ] Sber ID verification (stub)
- [ ] VK verification (stub)
- [ ] Gosuslugi verification (stub)
- [ ] MAKS verification (stub)

### Payment Systems
- [ ] Prodamus integration (stub)
- [ ] PayKeeper integration (stub)
- [ ] SPB integration (stub)
- [ ] AliPay integration (stub)

### Advertising Cabinet
- [ ] Ad tariffs management
- [ ] Ad statistics (views, clicks)
- [ ] Banner placement system
- [ ] Running line (ticker) ads
- [ ] Advertiser dashboard

### Admin System
- [ ] 5 levels of admin access with customizable permissions
- [ ] Admin level 1 (Super Admin)
- [ ] Admin level 2 (Moderator)
- [ ] Admin level 3 (Support)
- [ ] Admin level 4 (Analyst)
- [ ] Admin level 5 (Viewer)

### Owner Dashboard
- [ ] Voice command management (stub)
- [ ] AI-powered code editing interface (stub)

### User Types
- [ ] KomEkspo Employee type with badge and job title
- [ ] Employee profile with special marking

### Design & UX
- [ ] White-blue color scheme
- [ ] Space/cosmic theme
- [ ] Animations and visual effects
- [ ] AI Support Service ("Service of Care")
- [ ] AI chat integration (stub)

### Categories
- [ ] Copy category structure from Kwork
- [ ] Populate with Kwork categories

### Deployment
- [ ] SSH deployment to Beget (chernywo.beget.tech)
- [ ] Database setup on Beget
- [ ] Environment variables configuration
- [ ] Build and run on production

## Лид-модуль DAREMA (стоматология, СПб)

### Реализовано
- [x] Каталог из 10 направлений с лид-магнитом на каждое (`shared/dental.ts`)
- [x] Публичная форма записи `/dental` с согласиями 152-ФЗ / 38-ФЗ
- [x] Рейтинг срочности 0–100 с расшифровкой и SLA первого касания
- [x] Захват UTM-меток кампании («где поймали» заявку)
- [x] Таблицы `dental_leads` и `dental_lead_events` + миграция и индексы
- [x] tRPC-роутер: приём заявок, кабинет, статусы, история касаний
- [x] Кабинет `/dental/leads`: очередь по срочности, фильтры, отчёт по дням
- [x] Генератор .xlsx без внешних зависимостей (`server/lib/xlsx.ts`)
- [x] Выгрузка: отчёт по дням + общий лист + вкладка на каждый день
- [x] Шаблон первого сообщения в мессенджер под услугу и срочность
- [x] Отзыв согласия (`dental.optOut`) и запрет писать без согласия
- [x] 30 тестов на скоринг, согласия, xlsx, выгрузку и права доступа

### Дальше
- [ ] Сверить каталог направлений и лид-магниты с прайсом DAREMA
- [ ] Текст согласия и политика обработки ПД от юриста клиники
- [ ] Адреса и график клиник на странице записи
- [ ] Уведомление администратора о критичной заявке (SLA 15 минут)
- [ ] Счётчики Яндекс.Метрики и пикселя VK на `/dental`
- [ ] Запуск тестовых кампаний по семантике из `docs/dental-traffic.md`
- [ ] Отчёт по цене прихода в разрезе кампаний
