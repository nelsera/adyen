# PoC pagamento com cartao Adyen

Esta PoC tem tres repos locais:

- `adyen-card-front-vue`: Vue 3 puro para pagamento com cartao.
- `adyen-card-bff`: BFF que apenas encaminha requisicoes.
- `adyen-card-service`: microservico que cobra o cartao na Adyen sem armazenar.

## Ordem para rodar

Antes de subir os servicos, configure no Customer Area de teste da Adyen:

- API key em `Developers > API credentials`.
- Merchant account em `Settings > Merchant accounts`.

```bash
cd adyen-card-service
cp .env.example .env
npm install
npm run dev
```

```bash
cd adyen-card-bff
cp .env.example .env
npm install
npm run dev
```

```bash
cd adyen-card-front-vue
cp .env.example .env
npm install
npm run dev
```

Depois acesse `http://localhost:5173`.

## Observacoes da Adyen

- Use ambiente `test` ate validar a integracao.
- Cada tentativa de pagamento envia um header `Idempotency-Key`, repassado para a Adyen.
- Para testar, use Mastercard `5555 5555 5555 4444`, validade `03/2030` e CVC `737`.
- Em producao, revise PCI DSS, CSP e integridade do checkout com o time de seguranca.
