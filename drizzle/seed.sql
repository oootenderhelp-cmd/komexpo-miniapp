-- Komexpo Work: seed data for demo/development
-- Run after migrations: mysql -u root -proot komexpo_work --default-character-set=utf8mb4 < drizzle/seed.sql

SET NAMES utf8mb4;

-- Categories
INSERT IGNORE INTO categories (id, name, slug, description, icon, sortOrder, isActive) VALUES
(1, 'Веб-разработка', 'web-development', 'Сайты, приложения, CMS', 'Code', 1, 1),
(2, 'Дизайн', 'design', 'Графический и UX/UI дизайн', 'Palette', 2, 1),
(3, 'Маркетинг', 'marketing', 'SEO, реклама, SMM', 'TrendingUp', 3, 1),
(4, 'Копирайтинг', 'copywriting', 'Тексты, статьи, переводы', 'FileText', 4, 1),
(5, 'Видео и анимация', 'video', 'Монтаж, моушн, видео', 'Video', 5, 1),
(6, 'Бизнес', 'mobile-dev', 'Консалтинг, финансы, право', 'Briefcase', 6, 1),
(7, 'Обучение', 'seo', 'Репетиторы, курсы, менторство', 'GraduationCap', 7, 1),
(8, 'Администрирование', 'translations', 'DevOps, серверы, поддержка', 'Settings', 8, 1);

-- Demo users (password: Demo123! for all)
--PasswordHash generated with Node.js crypto.scryptSync
INSERT IGNORE INTO users (id, openId, email, name, loginMethod, passwordHash, role) VALUES
(2, 'demo-alexey', 'alexey@komexpo.ru', 'Алексей Петров', 'email', NULL, 'user'),
(3, 'demo-maria', 'maria@komexpo.ru', 'Мария Иванова', 'email', NULL, 'user'),
(4, 'demo-dmitry', 'dmitry@komexpo.ru', 'Дмитрий Козлов', 'email', NULL, 'user'),
(5, 'demo-elena', 'elena@komexpo.ru', 'Елена Сидорова', 'email', NULL, 'user'),
(6, 'demo-artem', 'artem@komexpo.ru', 'Артём Волков', 'email', NULL, 'user');

-- Contractor profiles
INSERT IGNORE INTO user_profiles (userId, displayName, bio, isCustomer, isContractor, contractorStatus, city, country, skills, rating, completedOrders, balance) VALUES
(2, 'Алексей П.', 'Full-stack разработчик с 8-летним опытом. React, Node.js, TypeScript.', 0, 1, 'freelancer', 'Москва', 'Россия', '["React","TypeScript","Node.js","PostgreSQL"]', 4.90, 47, 125000),
(3, 'Мария И.', 'UX/UI дизайнер. Figma, Adobe, Illustrator. Делаю красиво и удобно.', 0, 1, 'freelancer', 'Санкт-Петербург', 'Россия', '["Figma","Adobe XD","Illustrator"]', 4.80, 63, 89000),
(4, 'Дмитрий К.', 'SEO-специалист и маркетолог. Продвигаю сайты в топ за 3 месяца.', 0, 1, 'freelancer', 'Казань', 'Россия', '["SEO","Google Ads","Яндекс.Директ"]', 4.60, 28, 54000),
(5, 'Елена С.', 'Копирайтер и контент-менеджер. Пишу продающие тексты, ведение блогов.', 1, 1, 'freelancer', 'Новосибирск', 'Россия', '["Копирайтинг","SMM","Контент"]', 4.70, 85, 72000),
(6, 'Артём В.', 'Видеограф и монтажёр. Создаю рекламные ролики и обучающие курсы.', 1, 1, 'freelancer', 'Екатеринбург', 'Россия', '["Premiere Pro","After Effects","DaVinci"]', 4.90, 34, 45000);

-- Kvorki (services)
INSERT IGNORE INTO kvorki (id, userId, categoryId, title, slug, description, price, deliveryDays, status, rating, orderCount) VALUES
(1, 2, 1, 'Создам сайт на React + TypeScript', 'react-typescript-site', 'Разработка современного SPA на React с TypeScript. Адаптивный дизайн, SEO-оптимизация.', 25000, 7, 'active', 4.90, 23),
(2, 3, 1, 'Разработка REST API на Node.js', 'rest-api-nodejs', 'Создание REST API на Express с JWT авторизацией и тестами.', 18000, 5, 'active', 4.70, 15),
(3, 4, 2, 'Дизайн лендинга в Figma', 'landing-design-figma', 'Полный дизайн лендинга с UI Kit. До 7 экранов. 2 правки включены.', 12000, 4, 'active', 5.00, 31),
(4, 5, 2, 'Логотип и фирменный стиль', 'logo-brand-identity', 'Разработка логотипа, подбор фирменных цветов и шрифтов. 3 варианта.', 8000, 3, 'active', 4.80, 42),
(5, 6, 3, 'SEO-продвижение сайта', 'seo-promotion', 'Аудит сайта, семантическое ядро, оптимизация мета-тегов. Отчёт за месяц.', 15000, 30, 'active', 4.60, 18),
(6, 2, 4, 'Написание статей для блога', 'blog-articles', 'SEO-статьи для блога. До 5000 символов. Уникальность от 95%.', 3000, 2, 'active', 4.50, 27),
(7, 3, 5, 'Монтаж видеоролика', 'video-montage', 'Монтаж видео до 10 минут. Цветокоррекция, титры, переходы.', 7000, 3, 'active', 4.80, 12),
(8, 4, 6, 'Консультация по запуску бизнеса', 'business-consulting', 'Анализ ниши, бизнес-план, помощь с регистрацией ИП/ООО.', 5000, 1, 'active', 4.90, 9),
(9, 5, 7, 'Онлайн-репетитор по Python', 'python-tutor', 'Индивидуальные занятия по Python: от основ до web-разработки.', 2500, 1, 'active', 5.00, 35),
(10, 6, 1, 'Интеграция платёжной системы', 'payment-integration', 'Подключение YooKassa, Stripe или Тинькофф к вашему сайту.', 10000, 3, 'active', 4.70, 8);

-- Projects (job board)
INSERT IGNORE INTO projects (id, userId, categoryId, title, description, budget, deadline, status) VALUES
(1, 5, 1, 'Нужен интернет-магазин на React', 'Требуется разработка интернет-магазина с каталогом товаров, корзиной, оплатой и личным кабинетом.', 150000, DATE_ADD(NOW(), INTERVAL 30 DAY), 'open'),
(2, 6, 2, 'Редизайн корпоративного сайта', 'Полный редизайн корпоративного сайта строительной компании. Figma макеты + верстка.', 80000, DATE_ADD(NOW(), INTERVAL 21 DAY), 'open'),
(3, 5, 1, 'Разработка приложения для доставки', 'MVP мобильного приложения для доставки еды. React Native, backend на Node.js.', 120000, DATE_ADD(NOW(), INTERVAL 45 DAY), 'open'),
(4, 6, 3, 'SEO-продвижение сайта стоматологии', 'Нужен специалист для комплексного SEO-продвижения сайта стоматологической клиники.', 25000, DATE_ADD(NOW(), INTERVAL 60 DAY), 'open'),
(5, 5, 4, 'Тексты для лендинга IT-компании', 'Написание продающих текстов для лендинга IT-компании. 5 экранов, УТП, призывы к действию.', 12000, DATE_ADD(NOW(), INTERVAL 14 DAY), 'open');
