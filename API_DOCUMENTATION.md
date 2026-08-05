# Komexpo Work API Documentation

## Overview

Komexpo Work — это полнофункциональная фриланс-платформа, построенная на базе tRPC + React + Express + MySQL. Все операции выполняются через типобезопасные tRPC процедуры.

## Authentication

Все защищённые процедуры требуют JWT аутентификации. Текущий пользователь доступен как `ctx.user` в серверных процедурах.

```typescript
// Получить информацию о текущем пользователе
trpc.auth.me.useQuery()

// Выйти из аккаунта
trpc.auth.logout.useMutation()
```

## Core Routers

### Profile Router (`profile.*`)

Управление профилем пользователя.

```typescript
// Получить свой профиль
trpc.profile.me.useQuery()

// Обновить профиль
trpc.profile.update.useMutation({
  displayName: string
  bio: string
  isCustomer: boolean
  isContractor: boolean
  contractorStatus: 'freelancer' | 'agency' | 'employee'
  phone: string
  city: string
  country: string
  website: string
  skills: string[]
})

// Получить профиль пользователя по ID
trpc.profile.getById.useQuery(userId)
```

### Categories Router (`categories.*`)

Управление категориями услуг.

```typescript
// Получить список всех категорий
trpc.categories.list.useQuery()
```

### Kvorki Router (`kvorki.*`)

Управление услугами (кворками).

```typescript
// Получить список кворок с фильтрацией
trpc.kvorki.list.useQuery({
  search?: string
  categoryId?: number
  minPrice?: number
  maxPrice?: number
})

// Получить детали кворки
trpc.kvorki.getById.useQuery(kvorkaId)

// Создать новую кворку
trpc.kvorki.create.useMutation({
  title: string
  description: string
  price: number
  categoryId: number
  deliveryDays: number
  status: 'active' | 'inactive'
})

// Обновить кворку
trpc.kvorki.update.useMutation({
  id: number
  title?: string
  description?: string
  price?: number
  // ...
})

// Удалить кворку
trpc.kvorki.delete.useMutation(kvorkaId)
```

### Projects Router (`projects.*`)

Управление проектами на бирже.

```typescript
// Получить список проектов
trpc.projects.list.useQuery({
  search?: string
  categoryId?: number
  minBudget?: number
  maxBudget?: number
  status?: string
})

// Получить детали проекта
trpc.projects.getById.useQuery(projectId)

// Создать новый проект
trpc.projects.create.useMutation({
  title: string
  description: string
  budget: number
  categoryId: number
  deadline: Date
  status: 'open' | 'in_progress' | 'completed'
})

// Обновить проект
trpc.projects.update.useMutation({
  id: number
  // ...
})

// Удалить проект
trpc.projects.delete.useMutation(projectId)
```

### Orders Router (`orders.*`)

Управление заказами и безопасной сделкой.

```typescript
// Получить список заказов пользователя
trpc.orders.my.useQuery()

// Получить детали заказа
trpc.orders.getById.useQuery(orderId)

// Создать заказ (инициировать безопасную сделку)
trpc.orders.create.useMutation({
  kvorkaId: number
  quantity: number
  requirements?: string
})

// Обновить статус заказа
trpc.orders.updateStatus.useMutation({
  id: number
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
})

// Завершить заказ (выпустить средства из эскроу)
trpc.orders.complete.useMutation(orderId)

// Отменить заказ
trpc.orders.cancel.useMutation(orderId)
```

### Transactions Router (`transactions.*`)

Управление платежами и балансом.

```typescript
// Получить историю транзакций
trpc.transactions.my.useQuery()

// Пополнить баланс
trpc.transactions.deposit.useMutation({
  amount: number
})

// Вывести средства
trpc.transactions.withdraw.useMutation({
  amount: number
  method: 'card' | 'bank' | 'wallet'
  details: object
})
```

### Reviews Router (`reviews.*`)

Система отзывов и рейтингов.

```typescript
// Получить отзывы для пользователя
trpc.reviews.getForUser.useQuery(userId)

// Получить отзывы для кворки
trpc.reviews.getForKvorka.useQuery(kvorkaId)

// Создать отзыв
trpc.reviews.create.useMutation({
  orderId: number
  rating: number // 1-5
  text: string
})

// Обновить отзыв
trpc.reviews.update.useMutation({
  id: number
  rating?: number
  text?: string
})

// Удалить отзыв
trpc.reviews.delete.useMutation(reviewId)
```

### Chat Router (`chat.*`)

Система сообщений между пользователями.

```typescript
// Получить список диалогов
trpc.chat.conversations.useQuery()

// Получить сообщения диалога
trpc.chat.messages.useQuery(conversationId)

// Отправить сообщение
trpc.chat.sendMessage.useMutation({
  conversationId: number
  text: string
})

// Получить или создать диалог с пользователем
trpc.chat.getOrCreateConversation.useMutation(userId)
```

### Favorites Router (`favorites.*`)

Управление избранными услугами.

```typescript
// Получить избранные кворки
trpc.favorites.my.useQuery()

// Добавить/удалить из избранного
trpc.favorites.toggle.useMutation(kvorkaId)
```

### Notifications Router (`notifications.*`)

Система уведомлений.

```typescript
// Получить уведомления
trpc.notifications.my.useQuery()

// Отметить уведомление как прочитанное
trpc.notifications.markAsRead.useMutation(notificationId)
```

### Admin Router (`admin.*`)

Панель администратора (требует роль `admin`).

```typescript
// Получить список всех пользователей
trpc.admin.users.useQuery()

// Забанить пользователя
trpc.admin.banUser.useMutation(userId)

// Разбанить пользователя
trpc.admin.unbanUser.useMutation(userId)

// Изменить роль пользователя
trpc.admin.changeUserRole.useMutation({
  userId: number
  role: 'user' | 'admin'
})

// Получить список кворок на модерацию
trpc.admin.pendingKvorki.useQuery()

// Одобрить кворку
trpc.admin.approveKvorka.useMutation(kvorkaId)

// Отклонить кворку
trpc.admin.rejectKvorka.useMutation({
  kvorkaId: number
  reason: string
})

// Получить список споров
trpc.admin.disputes.useQuery()

// Разрешить спор
trpc.admin.resolveDispute.useMutation({
  disputeId: number
  resolution: 'refund' | 'complete'
})
```

### Owner Router (`owner.*`)

Дашборд владельца платформы (требует роль `owner`).

```typescript
// Получить статистику платформы
trpc.owner.stats.useQuery()

// Получить список администраторов
trpc.owner.admins.useQuery()

// Добавить администратора
trpc.owner.addAdmin.useMutation(userId)

// Удалить администратора
trpc.owner.removeAdmin.useMutation(userId)
```

### Ads Router (`ads.*`)

Рекламный кабинет.

```typescript
// Получить список рекламных кампаний пользователя
trpc.ads.my.useQuery()

// Получить доступные места для рекламы
trpc.ads.placements.useQuery()

// Создать рекламную кампанию
trpc.ads.create.useMutation({
  title: string
  description: string
  imageUrl: string
  targetUrl: string
  placementId: number
  budget: number
  startDate: Date
  endDate: Date
})

// Обновить кампанию
trpc.ads.update.useMutation({
  id: number
  // ...
})

// Удалить кампанию
trpc.ads.delete.useMutation(campaignId)
```

## Error Handling

Все ошибки возвращаются в стандартном формате tRPC:

```typescript
{
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'BAD_REQUEST' | 'INTERNAL_SERVER_ERROR'
  message: string
}
```

## Rate Limiting

На данный момент ограничения по количеству запросов не установлены. В production рекомендуется добавить rate limiting.

## Pagination

Процедуры, возвращающие списки, поддерживают пагинацию:

```typescript
{
  items: T[]
  total: number
  page: number
  limit: number
}
```

## WebSocket Events (Chat)

Чат использует WebSocket для real-time сообщений:

- `message:new` — новое сообщение
- `conversation:created` — создан новый диалог
- `user:typing` — пользователь печатает

## Security

- Все чувствительные операции требуют аутентификации
- Пользователи могут видеть только свои данные
- Администраторы имеют полный доступ к модерации
- Владелец имеет доступ ко всей статистике платформы
- Комиссия платформы (15%) вычисляется автоматически при завершении заказа

## Escrow System

Безопасная сделка работает следующим образом:

1. Заказчик создаёт заказ → средства резервируются (статус: `pending`)
2. Подрядчик принимает заказ → статус меняется на `accepted`
3. Подрядчик выполняет работу → статус меняется на `in_progress`
4. Заказчик подтверждает выполнение → статус меняется на `completed`
5. Средства выпускаются подрядчику минус 15% комиссия платформы

## Commission Structure

- **Комиссия платформы:** 15% от суммы заказа
- **Удержание:** Происходит автоматически при завершении заказа
- **Вывод средств:** Минимум 500 ₽, обработка 1-3 дня

## Example Usage

```typescript
import { trpc } from '@/lib/trpc';

// Получить каталог услуг
const { data: kvorki } = trpc.kvorki.list.useQuery({
  categoryId: 1,
  maxPrice: 5000
});

// Создать заказ
const createOrder = trpc.orders.create.useMutation({
  onSuccess: () => {
    console.log('Заказ создан');
  },
  onError: (error) => {
    console.error('Ошибка:', error.message);
  }
});

createOrder.mutate({
  kvorkaId: 123,
  quantity: 1,
  requirements: 'Срочно'
});
```

## Support

Для вопросов и поддержки обращайтесь к администратору платформы.
