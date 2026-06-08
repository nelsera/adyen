import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import { adyenPost } from './adyenClient.js';
import { assertAdyenConfig, config } from './config.js';
import {
  chargeCardSchema,
  rejectRawCardData,
  toAdyenPaymentMethod
} from './validation.js';

assertAdyenConfig();

const app = express();
const idempotencyKeyPattern = /^[A-Za-z0-9_-]{1,64}$/;

app.use(helmet());
app.use(express.json({ limit: '64kb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'adyen-card-service' });
});

app.post('/payments/charge', async (req, res, next) => {
  try {
    const idempotencyKey = req.get('idempotency-key');

    if (!idempotencyKey || !idempotencyKeyPattern.test(idempotencyKey)) {
      return res.status(400).json({
        error: 'invalid_idempotency_key',
        message: 'Send an Idempotency-Key header with 1-64 URL-safe characters.'
      });
    }

    rejectRawCardData(req.body);
    const input = chargeCardSchema.parse(req.body);
    const paymentMethod = toAdyenPaymentMethod(input);

    const { body: response, headers } = await adyenPost('/payments', {
      merchantAccount: config.merchantAccount,
      amount: input.amount,
      reference: input.reference ?? `card-payment-${Date.now()}`,
      paymentMethod,
      shopperInteraction: 'Ecommerce',
      returnUrl: input.returnUrl,
      countryCode: input.countryCode,
      channel: 'Web',
      origin: input.origin,
      browserInfo: input.browserInfo,
      riskData: input.riskData
    }, {
      headers: {
        'idempotency-key': idempotencyKey
      }
    });

    const adyenIdempotencyKey = headers.get('idempotency-key');
    if (adyenIdempotencyKey) {
      res.set('Idempotency-Key', adyenIdempotencyKey);
    }

    res.json({
      resultCode: response.resultCode,
      pspReference: response.pspReference,
      action: response.action,
      refusalReason: response.refusalReason,
      additionalData: response.additionalData
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  const status = error.status ?? (error.name === 'ZodError' ? 400 : 500);

  if (error.idempotencyKey) {
    res.set('Idempotency-Key', error.idempotencyKey);
  }

  if (error.transientError) {
    res.set('Transient-Error', 'true');
  }

  res.status(status).json({
    error: error.name ?? 'service_error',
    message: error.message,
    details: error.issues ?? error.body,
    transientError: error.transientError
  });
});

app.listen(config.port, () => {
  console.log(`adyen-card-service listening on http://localhost:${config.port}`);
});
