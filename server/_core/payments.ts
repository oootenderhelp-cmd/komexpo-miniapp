/**
 * Payment Gateway Stubs
 * Имитирует работу платежных систем для разработки
 */

export interface PaymentStubResult {
  success: boolean;
  transactionId: string;
  message: string;
  timestamp: Date;
}

/**
 * Prodamus Payment Stub
 * Имитирует платёж через Prodamus
 */
export async function prodamusPayment(
  amount: number,
  email: string,
  description: string
): Promise<PaymentStubResult> {
  console.log(`[PRODAMUS STUB] Платёж: ${amount} ₽ для ${email}`);
  console.log(`[PRODAMUS STUB] Описание: ${description}`);
  
  // Имитируем задержку обработки
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const transactionId = `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[PRODAMUS STUB] ✅ Платёж успешен. ID: ${transactionId}`);
  
  return {
    success: true,
    transactionId,
    message: `Платёж обработан через Prodamus (демо)`,
    timestamp: new Date(),
  };
}

/**
 * PayKeeper Payment Stub
 * Имитирует платёж через PayKeeper
 */
export async function paykeeperPayment(
  amount: number,
  email: string,
  description: string
): Promise<PaymentStubResult> {
  console.log(`[PAYKEEPER STUB] Платёж: ${amount} ₽ для ${email}`);
  console.log(`[PAYKEEPER STUB] Описание: ${description}`);
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const transactionId = `PK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[PAYKEEPER STUB] ✅ Платёж успешен. ID: ${transactionId}`);
  
  return {
    success: true,
    transactionId,
    message: `Платёж обработан через PayKeeper (демо)`,
    timestamp: new Date(),
  };
}

/**
 * СПБ (Сбербанк) Payment Stub
 */
export async function sberbankPayment(
  amount: number,
  email: string,
  description: string
): Promise<PaymentStubResult> {
  console.log(`[SBERBANK STUB] Платёж: ${amount} ₽ для ${email}`);
  console.log(`[SBERBANK STUB] Описание: ${description}`);
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const transactionId = `SBR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[SBERBANK STUB] ✅ Платёж успешен. ID: ${transactionId}`);
  
  return {
    success: true,
    transactionId,
    message: `Платёж обработан через Сбербанк (демо)`,
    timestamp: new Date(),
  };
}

/**
 * AliPay Payment Stub
 */
export async function alipayPayment(
  amount: number,
  email: string,
  description: string
): Promise<PaymentStubResult> {
  console.log(`[ALIPAY STUB] Платёж: ${amount} ₽ для ${email}`);
  console.log(`[ALIPAY STUB] Описание: ${description}`);
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const transactionId = `ALI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[ALIPAY STUB] ✅ Платёж успешен. ID: ${transactionId}`);
  
  return {
    success: true,
    transactionId,
    message: `Платёж обработан через AliPay (демо)`,
    timestamp: new Date(),
  };
}

/**
 * ЮKassa Payment Stub (основная система)
 */
export async function yukassaPayment(
  amount: number,
  email: string,
  description: string
): Promise<PaymentStubResult> {
  console.log(`[YUKASSA STUB] Платёж: ${amount} ₽ для ${email}`);
  console.log(`[YUKASSA STUB] Описание: ${description}`);
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const transactionId = `YK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[YUKASSA STUB] ✅ Платёж успешен. ID: ${transactionId}`);
  
  return {
    success: true,
    transactionId,
    message: `Платёж обработан через ЮKassa (демо)`,
    timestamp: new Date(),
  };
}
