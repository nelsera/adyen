import { z } from 'zod';
import { config } from './config.js';

const amountSchema = z.object({
  currency: z.string().length(3).default(config.defaultCurrency),
  value: z.number().int().min(0).default(0)
});

const encryptedCardSchema = z.object({
  type: z.literal('scheme'),
  holderName: z.string().min(1).max(80).optional(),
  encryptedCardNumber: z.string().min(20),
  encryptedExpiryMonth: z.string().min(20),
  encryptedExpiryYear: z.string().min(20),
  encryptedSecurityCode: z.string().min(20)
}).passthrough();

const rawTestCardSchema = z.object({
  holderName: z.string().min(1).max(80),
  number: z.string().regex(/^\d{13,19}$/),
  expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/),
  expiryYear: z.string().regex(/^\d{4}$/),
  securityCode: z.string().regex(/^\d{3,4}$/)
});

export const chargeCardSchema = z.object({
  reference: z.string().min(3).max(128).optional(),
  countryCode: z.string().length(2).default(config.defaultCountryCode),
  amount: amountSchema.refine((amount) => amount.value > 0, {
    message: 'Payment amount must be greater than zero.'
  }),
  paymentMethod: encryptedCardSchema.optional(),
  card: rawTestCardSchema.optional(),
  browserInfo: z.record(z.unknown()).optional(),
  origin: z.string().url().optional(),
  returnUrl: z.string().url(),
  riskData: z.record(z.unknown()).optional()
}).passthrough().refine((data) => data.paymentMethod || data.card, {
  message: 'Send either paymentMethod with encrypted card data or card for test-only payment.'
});

export function rejectRawCardData(payload) {
  if (!payload || typeof payload !== 'object') {
    const error = new Error('Request body must be a JSON object.');
    error.status = 400;
    throw error;
  }

  if (config.adyenEnvironment === 'test' && payload.card) {
    return;
  }

  const raw = JSON.stringify(payload).toLowerCase();
  const forbiddenKeys = ['"number"', '"securityCode"', '"cvc"', '"cvv"', '"expiryMonth"', '"expiryYear"'];

  if (forbiddenKeys.some((key) => raw.includes(key.toLowerCase()))) {
    const error = new Error('Raw card data is not accepted. Use Adyen encrypted card fields only.');
    error.status = 400;
    throw error;
  }
}

export function toAdyenPaymentMethod(input) {
  if (input.paymentMethod) {
    return input.paymentMethod;
  }

  if (config.adyenEnvironment !== 'test') {
    const error = new Error('Raw card data is only accepted in ADYEN_ENVIRONMENT=test.');
    error.status = 400;
    throw error;
  }

  return {
    type: 'scheme',
    holderName: input.card.holderName,
    encryptedCardNumber: `test_${input.card.number}`,
    encryptedExpiryMonth: `test_${input.card.expiryMonth}`,
    encryptedExpiryYear: `test_${input.card.expiryYear}`,
    encryptedSecurityCode: `test_${input.card.securityCode}`
  };
}
