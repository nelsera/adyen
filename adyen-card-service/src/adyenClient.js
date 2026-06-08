import { checkoutBaseUrl, config } from './config.js';

export async function adyenPost(path, payload, options = {}) {
  const response = await fetch(`${checkoutBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.adyenApiKey,
      ...(options.headers ?? {})
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = body.message ?? body.errorMessage ?? `Adyen HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    error.transientError = response.headers.get('transient-error') === 'true';
    error.idempotencyKey = response.headers.get('idempotency-key');
    throw error;
  }

  return {
    body,
    headers: response.headers
  };
}
