<script setup>
import { computed, reactive, ref } from 'vue';

const bffBaseUrl = import.meta.env.VITE_BFF_BASE_URL ?? 'http://localhost:3000';
const countryCode = import.meta.env.VITE_COUNTRY_CODE ?? 'BR';
const currency = import.meta.env.VITE_CURRENCY ?? 'BRL';
const amountValue = Number(import.meta.env.VITE_PAYMENT_AMOUNT_VALUE ?? 1000);

const card = reactive({
  holderName: '',
  number: '',
  expiryMonth: '',
  expiryYear: '',
  securityCode: ''
});

const isLoading = ref(false);
const isPaymentCompleted = ref(false);
const status = ref('');
const errorMessage = ref('');
const paymentAttemptId = ref(crypto.randomUUID());

const sanitizedNumber = computed(() => card.number.replace(/\D/g, ''));
const normalizedYear = computed(() => {
  const value = card.expiryYear.replace(/\D/g, '');
  return value.length === 2 ? `20${value}` : value;
});

async function requestJson(path, options = {}) {
  let response;
  const headers = {
    'content-type': 'application/json',
    ...(options.headers ?? {})
  };

  try {
    response = await fetch(`${bffBaseUrl}${path}`, {
      ...options,
      headers
    });
  } catch {
    throw new Error(`BFF indisponivel em ${bffBaseUrl}. Inicie o adyen-card-bff e o adyen-card-service.`);
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message ?? body.error ?? `HTTP ${response.status}`);
  }

  return body;
}

function validateCard() {
  if (card.holderName.trim().length < 2) return 'Informe o nome impresso no cartao.';
  if (sanitizedNumber.value.length < 13) return 'Informe um numero de cartao valido.';
  if (!/^(0[1-9]|1[0-2])$/.test(card.expiryMonth)) return 'Informe o mes de validade com dois digitos.';
  if (!/^\d{4}$/.test(normalizedYear.value)) return 'Informe o ano de validade.';
  if (!/^\d{3,4}$/.test(card.securityCode)) return 'Informe o codigo de seguranca.';
  return '';
}

async function payWithCard() {
  if (isPaymentCompleted.value) {
    return;
  }

  const validationError = validateCard();
  if (validationError) {
    errorMessage.value = validationError;
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';
  status.value = 'Processando pagamento...';

  try {
    const result = await requestJson('/api/payments', {
      method: 'POST',
      headers: {
        'idempotency-key': paymentAttemptId.value
      },
      body: JSON.stringify({
        countryCode,
        amount: {
          currency,
          value: amountValue
        },
        returnUrl: `${window.location.origin}/adyen-return`,
        origin: window.location.origin,
        card: {
          holderName: card.holderName.trim(),
          number: sanitizedNumber.value,
          expiryMonth: card.expiryMonth,
          expiryYear: normalizedYear.value,
          securityCode: card.securityCode
        }
      })
    });

    status.value = result.resultCode
      ? `Pagamento enviado: ${result.resultCode}`
      : 'Pagamento enviado.';
    isPaymentCompleted.value = ['Authorised', 'Received', 'Pending'].includes(result.resultCode);
  } catch (error) {
    errorMessage.value = error.message;
    status.value = 'Falha no pagamento.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <main class="shell">
    <section class="card-payment" aria-busy="isLoading">
      <h1>Pagamento com cartao de credito</h1>
      <form class="payment-panel" @submit.prevent="payWithCard">
        <div class="amount-summary">
          <span>Total</span>
          <strong>{{ currency }} {{ (amountValue / 100).toFixed(2) }}</strong>
        </div>

        <label class="field field-full">
          Nome impresso no cartao
          <input
            v-model="card.holderName"
            autocomplete="cc-name"
            class="text-input"
            placeholder="Nome como aparece no cartao"
            type="text"
          />
        </label>

        <label class="field field-full">
          Numero do cartao
          <input
            v-model="card.number"
            autocomplete="cc-number"
            class="text-input"
            inputmode="numeric"
            maxlength="23"
            placeholder="0000 0000 0000 0000"
            type="text"
          />
        </label>

        <label class="field">
          Validade mes
          <input
            v-model="card.expiryMonth"
            autocomplete="cc-exp-month"
            class="text-input"
            inputmode="numeric"
            maxlength="2"
            placeholder="MM"
            type="text"
          />
        </label>

        <label class="field">
          Validade ano
          <input
            v-model="card.expiryYear"
            autocomplete="cc-exp-year"
            class="text-input"
            inputmode="numeric"
            maxlength="4"
            placeholder="AAAA"
            type="text"
          />
        </label>

        <label class="field field-full">
          Codigo de seguranca
          <input
            v-model="card.securityCode"
            autocomplete="cc-csc"
            class="text-input"
            inputmode="numeric"
            maxlength="4"
            placeholder="CVC"
            type="password"
          />
        </label>

        <button class="submit-button" :disabled="isLoading || isPaymentCompleted" type="submit">
          {{ isLoading ? 'Processando...' : isPaymentCompleted ? 'Pagamento enviado' : 'Pagar agora' }}
        </button>

        <p v-if="status" class="status">{{ status }}</p>
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      </form>
    </section>
  </main>
</template>
