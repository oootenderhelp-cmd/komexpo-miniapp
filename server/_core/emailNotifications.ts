/**
 * Email Notifications Stub
 * Имитирует отправку email-уведомлений (логирует в консоль)
 */

export interface EmailNotification {
  to: string;
  subject: string;
  body: string;
  html?: string;
  sentAt: Date;
}

const emailLog: EmailNotification[] = [];

/**
 * Отправить email (заглушка)
 * В production используется SMTP сервер
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  html?: string
): Promise<boolean> {
  const notification: EmailNotification = {
    to,
    subject,
    body,
    html,
    sentAt: new Date(),
  };
  
  emailLog.push(notification);
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[EMAIL STUB] ✉️  Email отправлен`);
  console.log(`Кому: ${to}`);
  console.log(`Тема: ${subject}`);
  console.log(`Время: ${notification.sentAt.toISOString()}`);
  console.log(`Текст: ${body.substring(0, 100)}...`);
  console.log(`${'='.repeat(60)}\n`);
  
  return true;
}

/**
 * Отправить email о новом заказе
 */
export async function sendNewOrderEmail(
  contractorEmail: string,
  contractorName: string,
  kvorkaTitle: string,
  orderId: string
): Promise<boolean> {
  const subject = `🎉 Новый заказ: ${kvorkaTitle}`;
  const body = `
Привет, ${contractorName}!

У вас новый заказ на вашу услугу "${kvorkaTitle}".

ID заказа: ${orderId}

Перейди в личный кабинет, чтобы посмотреть детали и начать работу.

---
Komexpo Work
  `;
  
  return sendEmail(contractorEmail, subject, body);
}

/**
 * Отправить email о принятии заказа
 */
export async function sendOrderAcceptedEmail(
  customerEmail: string,
  customerName: string,
  contractorName: string,
  kvorkaTitle: string,
  orderId: string
): Promise<boolean> {
  const subject = `✅ Ваш заказ принят: ${kvorkaTitle}`;
  const body = `
Привет, ${customerName}!

Ваш заказ "${kvorkaTitle}" принят исполнителем ${contractorName}.

ID заказа: ${orderId}

Вы можете отслеживать прогресс в личном кабинете.

---
Komexpo Work
  `;
  
  return sendEmail(customerEmail, subject, body);
}

/**
 * Отправить email о завершении заказа
 */
export async function sendOrderCompletedEmail(
  customerEmail: string,
  customerName: string,
  contractorName: string,
  kvorkaTitle: string,
  orderId: string
): Promise<boolean> {
  const subject = `🎊 Заказ завершён: ${kvorkaTitle}`;
  const body = `
Привет, ${customerName}!

Ваш заказ "${kvorkaTitle}" завершён исполнителем ${contractorName}.

ID заказа: ${orderId}

Пожалуйста, проверьте работу и оставьте отзыв.

---
Komexpo Work
  `;
  
  return sendEmail(customerEmail, subject, body);
}

/**
 * Отправить email о новом сообщении в чате
 */
export async function sendChatMessageEmail(
  recipientEmail: string,
  recipientName: string,
  senderName: string,
  messagePreview: string
): Promise<boolean> {
  const subject = `💬 Новое сообщение от ${senderName}`;
  const body = `
Привет, ${recipientName}!

${senderName} отправил вам сообщение:

"${messagePreview}"

Ответь в личном кабинете.

---
Komexpo Work
  `;
  
  return sendEmail(recipientEmail, subject, body);
}

/**
 * Отправить email о пополнении баланса
 */
export async function sendDepositEmail(
  userEmail: string,
  userName: string,
  amount: number,
  transactionId: string
): Promise<boolean> {
  const subject = `✅ Баланс пополнен на ${amount} ₽`;
  const body = `
Привет, ${userName}!

Ваш баланс успешно пополнен на ${amount} ₽.

ID транзакции: ${transactionId}

Теперь вы можете размещать заказы или оплачивать услуги.

---
Komexpo Work
  `;
  
  return sendEmail(userEmail, subject, body);
}

/**
 * Отправить email о выводе средств
 */
export async function sendWithdrawalEmail(
  userEmail: string,
  userName: string,
  amount: number,
  transactionId: string
): Promise<boolean> {
  const subject = `💸 Запрос на вывод ${amount} ₽`;
  const body = `
Привет, ${userName}!

Ваш запрос на вывод ${amount} ₽ создан.

ID транзакции: ${transactionId}

Средства будут переведены в течение 1-3 рабочих дней.

---
Komexpo Work
  `;
  
  return sendEmail(userEmail, subject, body);
}

/**
 * Отправить email о спорe
 */
export async function sendDisputeEmail(
  userEmail: string,
  userName: string,
  orderId: string,
  reason: string
): Promise<boolean> {
  const subject = `⚠️ Спор по заказу ${orderId}`;
  const body = `
Привет, ${userName}!

По вашему заказу ${orderId} открыт спор.

Причина: ${reason}

Наша служба поддержки рассмотрит вашу жалобу в течение 24 часов.

---
Komexpo Work
  `;
  
  return sendEmail(userEmail, subject, body);
}

/**
 * Получить логи всех отправленных email
 */
export function getEmailLog(): EmailNotification[] {
  return emailLog;
}

/**
 * Очистить логи email
 */
export function clearEmailLog(): void {
  emailLog.length = 0;
  console.log(`[EMAIL STUB] ✅ Логи email очищены`);
}

/**
 * Получить количество отправленных email
 */
export function getEmailCount(): number {
  return emailLog.length;
}
