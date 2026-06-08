# adyen-card-front-vue

Front em Vue 3 para pagamento com cartao de credito.

Esta variante nao usa SDK ou componente da Adyen no navegador. Ela coleta os campos no Vue e envia para o BFF.

## Como rodar

```bash
cp .env.example .env
npm install
npm run dev
```

Abra `http://localhost:5173` e preencha os dados do cartao para cobrar na hora.

Antes de abrir a tela, confirme que o `adyen-card-service` e o `adyen-card-bff` estao rodando.

Cartao de teste sugerido:

- Numero: `5555 5555 5555 4444`
- Validade: `03/2030`
- CVC: `737`

## Aviso de seguranca

Este modo e apenas para PoC em ambiente `test`. Coletar numero de cartao e CVC em inputs proprios coloca o front e o backend em escopo PCI DSS maior. Em producao, use HTTPS obrigatorio e passe por revisao PCI/security.

## Idempotencia

O front gera um UUID por tentativa de pagamento e envia no header `Idempotency-Key`. Se a mesma tentativa precisar ser repetida por timeout ou falha temporaria, reutilize a mesma chave. Depois de uma resposta terminal, a tela bloqueia novos cliques no botao para nao criar novas tentativas.
