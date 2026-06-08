# adyen-card-bff

BFF em Express. Ele nao conhece regra da Adyen: apenas encaminha chamadas do front para o microservico.

## Como rodar

```bash
cp .env.example .env
npm install
npm run dev
```

Endpoints:

- `POST /api/payments`

No fluxo Vue puro, o front usa `POST /api/payments` para cobrar o cartao.

## Idempotencia

O BFF espera o header `Idempotency-Key` no `POST /api/payments` e repassa o valor para o microservico. Tambem expoe os headers `Idempotency-Key` e `Transient-Error` retornados.
