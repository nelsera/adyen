# adyen-card-service

Microservico responsavel pela integracao com a Adyen Checkout API.

## Como rodar

```bash
cp .env.example .env
npm install
npm run dev
```

Configure no `.env`:

- `ADYEN_API_KEY`
- `ADYEN_MERCHANT_ACCOUNT`

## Depois de criar a conta teste da Adyen

1. Acesse o Customer Area de teste: `https://ca-test.adyen.com/`.
2. Pegue o merchant account em `Settings > Merchant accounts`.
3. Crie ou abra uma API credential em `Developers > API credentials`.
4. Copie a API key dessa credential para `ADYEN_API_KEY`.
5. Clique em `Save changes` na Adyen. Chave gerada/alterada sem salvar pode continuar dando `401 Unauthorized`.
6. Confirme que o `.env` ficou parecido com:

```env
ADYEN_ENVIRONMENT=test
ADYEN_API_KEY=...
ADYEN_MERCHANT_ACCOUNT=...
```

Nao deixe linhas soltas no `.env`. Cada linha precisa estar no formato `NOME=valor`.

Se a API key foi compartilhada em print, chat, commit ou log, gere outra em `Generate API key`, salve na Adyen e atualize o `.env`.

Para testar na tela, use um cartao de teste da Adyen, por exemplo Mastercard `5555 5555 5555 4444`, validade `03/2030` e CVC `737`.

## Fluxo implementado

1. `POST /payments/charge` recebe o payload do BFF.
2. Em `ADYEN_ENVIRONMENT=test`, o servico converte o cartao de teste para o formato `test_` aceito pela Adyen.
3. `POST /payments/charge` chama `/payments` da Adyen sem `storePaymentMethod`, sem `shopperReference` e sem `recurringProcessingModel`, cobrando o cartao na hora sem armazenar.

## Seguranca

Em producao, este servico deve receber apenas campos criptografados da Adyen ou passar por revisao PCI DSS completa. Nesta PoC, o front Vue envia cartao cru para o BFF em ambiente `test`.

## Modo Vue puro para teste

Para a PoC sem SDK da Adyen no front, o endpoint `POST /payments/charge` aceita cartao cru somente em `ADYEN_ENVIRONMENT=test`:

```json
{
  "amount": { "currency": "BRL", "value": 1000 },
  "returnUrl": "http://localhost:5173/adyen-return",
  "card": {
    "holderName": "Teste",
    "number": "5555555555554444",
    "expiryMonth": "03",
    "expiryYear": "2030",
    "securityCode": "737"
  }
}
```

O servico converte para `test_5555555555554444`, `test_03`, `test_2030` e `test_737`, que e o formato de teste suportado pela Adyen para API-only. Nao use esse modo em producao sem revisao PCI DSS.

## Idempotencia

O endpoint `POST /payments/charge` exige o header `Idempotency-Key` com ate 64 caracteres. O servico repassa esse header para a Adyen em `/payments`, conforme a documentacao oficial de idempotencia.

Exemplo:

```bash
curl http://localhost:4000/payments/charge \
  -H 'content-type: application/json' \
  -H 'idempotency-key: 6f84d5d6-8c41-4b2f-9b54-5b59e89c42aa' \
  --data '{"amount":{"currency":"BRL","value":1000},"returnUrl":"http://localhost:5173/adyen-return","card":{"holderName":"Teste","number":"5555555555554444","expiryMonth":"03","expiryYear":"2030","securityCode":"737"}}'
```

Se a Adyen retornar `Transient-Error: true`, faça retry com backoff usando a mesma chave.

A idempotencia vale para a mesma chave. Se o cliente enviar uma nova `Idempotency-Key`, a Adyen trata como uma nova tentativa de pagamento.
