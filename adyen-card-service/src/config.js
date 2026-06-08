import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 4000),
  adyenEnvironment: process.env.ADYEN_ENVIRONMENT ?? 'test',
  adyenApiVersion: process.env.ADYEN_CHECKOUT_API_VERSION ?? 'v71',
  adyenApiKey: process.env.ADYEN_API_KEY,
  merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
  defaultCountryCode: process.env.DEFAULT_COUNTRY_CODE ?? 'BR',
  defaultCurrency: process.env.DEFAULT_CURRENCY ?? 'BRL'
};

export function checkoutBaseUrl() {
  if (config.adyenEnvironment === 'live') {
    throw new Error('Set the live checkout URL prefix before using ADYEN_ENVIRONMENT=live.');
  }

  return `https://checkout-test.adyen.com/${config.adyenApiVersion}`;
}

export function assertAdyenConfig() {
  const missing = [];
  const placeholders = [];

  if (!config.adyenApiKey) missing.push('ADYEN_API_KEY');
  if (!config.merchantAccount) missing.push('ADYEN_MERCHANT_ACCOUNT');

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

  if (config.adyenApiKey === 'changeme') placeholders.push('ADYEN_API_KEY');
  if (config.merchantAccount === 'YourMerchantAccount') placeholders.push('ADYEN_MERCHANT_ACCOUNT');

  if (placeholders.length > 0) {
    throw new Error(`Replace placeholder env vars in .env: ${placeholders.join(', ')}`);
  }
}
