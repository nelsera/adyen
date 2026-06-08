import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

const app = express();
const port = Number(process.env.PORT ?? 3000);
const cardServiceBaseUrl = process.env.CARD_SERVICE_BASE_URL ?? 'http://localhost:4000';
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

app.use(helmet());
app.use(cors({
  origin: frontendOrigin,
  allowedHeaders: ['content-type', 'idempotency-key'],
  exposedHeaders: ['idempotency-key', 'transient-error']
}));
app.use(express.json({ limit: '64kb' }));
app.use(express.text({ limit: '64kb', type: 'text/plain' }));

async function forward(path, options = {}) {
  const { headers: optionHeaders, ...fetchOptions } = options;

  const response = await fetch(`${cardServiceBaseUrl}${path}`, {
    ...fetchOptions,
    headers: { 'content-type': 'application/json', ...(optionHeaders ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  return {
    status: response.status,
    body,
    headers: {
      idempotencyKey: response.headers.get('idempotency-key'),
      transientError: response.headers.get('transient-error')
    }
  };
}

function sendForwarded(res, result) {
  res.status(result.status).json(result.body);
}

function normalizeJsonBody(body) {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      const error = new Error('Request body must be valid JSON.');
      error.status = 400;
      error.code = 'invalid_json_body';
      throw error;
    }
  }

  return body;
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'adyen-card-bff' });
});

app.post('/api/payments', async (req, res, next) => {
  try {
    const payload = normalizeJsonBody(req.body);

    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({
        error: 'invalid_json_body',
        message: 'Send the payment payload as JSON with content-type: application/json.'
      });
    }

    const idempotencyKey = req.get('idempotency-key');
    const result = await forward('/payments/charge', {
      method: 'POST',
      headers: idempotencyKey ? { 'idempotency-key': idempotencyKey } : {},
      body: JSON.stringify(payload)
    });

    if (result.headers?.idempotencyKey) {
      res.set('Idempotency-Key', result.headers.idempotencyKey);
    }

    if (result.headers?.transientError) {
      res.set('Transient-Error', result.headers.transientError);
    }

    sendForwarded(res, result);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  res.status(error.status ?? 502).json({
    error: error.code ?? 'bff_forward_error',
    message: error.message
  });
});

app.listen(port, () => {
  console.log(`adyen-card-bff listening on http://localhost:${port}`);
});
