/**
 * Verification Stubs
 * Имитирует работу систем верификации
 */

export interface VerificationResult {
  success: boolean;
  verificationId: string;
  message: string;
  timestamp: Date;
}

/**
 * SMS Verification Stub
 */
export async function sendSmsVerification(phone: string): Promise<VerificationResult> {
  console.log(`[SMS STUB] Отправка кода на номер: ${phone}`);
  
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const verificationId = `SMS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[SMS STUB] ✅ Код отправлен: ${code} (для демо)`);
  
  return {
    success: true,
    verificationId,
    message: `Код верификации отправлен на ${phone}. Для демо используйте: ${code}`,
    timestamp: new Date(),
  };
}

/**
 * Tinkoff ID Verification Stub
 */
export async function tinkoffIdVerification(email: string): Promise<VerificationResult> {
  console.log(`[TINKOFF ID STUB] Верификация через Tinkoff ID для: ${email}`);
  
  const verificationId = `TINKOFF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[TINKOFF ID STUB] ✅ Верификация успешна. ID: ${verificationId}`);
  
  return {
    success: true,
    verificationId,
    message: `Верификация через Tinkoff ID успешна (демо)`,
    timestamp: new Date(),
  };
}

/**
 * Sberbank ID Verification Stub
 */
export async function sberbankIdVerification(email: string): Promise<VerificationResult> {
  console.log(`[SBERBANK ID STUB] Верификация через Sberbank ID для: ${email}`);
  
  const verificationId = `SBER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[SBERBANK ID STUB] ✅ Верификация успешна. ID: ${verificationId}`);
  
  return {
    success: true,
    verificationId,
    message: `Верификация через Sberbank ID успешна (демо)`,
    timestamp: new Date(),
  };
}

/**
 * VK ID Verification Stub
 */
export async function vkIdVerification(email: string): Promise<VerificationResult> {
  console.log(`[VK ID STUB] Верификация через VK ID для: ${email}`);
  
  const verificationId = `VK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[VK ID STUB] ✅ Верификация успешна. ID: ${verificationId}`);
  
  return {
    success: true,
    verificationId,
    message: `Верификация через VK ID успешна (демо)`,
    timestamp: new Date(),
  };
}

/**
 * Gosuslugi (Государственные услуги) Verification Stub
 */
export async function gosuslugiVerification(email: string): Promise<VerificationResult> {
  console.log(`[GOSUSLUGI STUB] Верификация через Госуслуги для: ${email}`);
  
  const verificationId = `GOSUSLUGI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[GOSUSLUGI STUB] ✅ Верификация успешна. ID: ${verificationId}`);
  
  return {
    success: true,
    verificationId,
    message: `Верификация через Госуслуги успешна (демо)`,
    timestamp: new Date(),
  };
}

/**
 * MAKS (МЭ.РУ) Verification Stub
 */
export async function maksVerification(email: string): Promise<VerificationResult> {
  console.log(`[MAKS STUB] Верификация через МАКС для: ${email}`);
  
  const verificationId = `MAKS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[MAKS STUB] ✅ Верификация успешна. ID: ${verificationId}`);
  
  return {
    success: true,
    verificationId,
    message: `Верификация через МАКС успешна (демо)`,
    timestamp: new Date(),
  };
}

/**
 * Verify SMS Code Stub
 */
export async function verifySmsCode(phone: string, code: string): Promise<boolean> {
  console.log(`[SMS STUB] Проверка кода ${code} для ${phone}`);
  
  // Для демо: любой код начинающийся с 1 считается правильным
  const isValid = code.startsWith('1') || code === '000000';
  
  if (isValid) {
    console.log(`[SMS STUB] ✅ Код верный`);
  } else {
    console.log(`[SMS STUB] ❌ Код неверный`);
  }
  
  return isValid;
}
