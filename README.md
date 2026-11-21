# MAKARIA — Appwrite

Aplicativo de finanças pessoais para GitHub Pages.

## O que já está pronto
- cadastro e login com Appwrite Auth
- dashboard com saldo, entradas, gastos e investimentos
- transações
- metas
- contas
- cartões
- salário com regras editáveis
- categorias com limite mensal
- modo claro/escuro
- layout responsivo
- identidade MAKARIA verde oliva

## Antes de publicar
Abra `app.js` e preencha os IDs das oito tabelas no objeto `C.tables`.

O Appwrite já está configurado com:
- endpoint: https://nyc.cloud.appwrite.io/v1
- project ID: 6b01e299000b19ac36ce
- database ID: 6b01e350001ca47807e5

Não coloque API Key no navegador ou no GitHub Pages.

## Tabelas
profiles, settings, transactions, goals, accounts, categories, bills, cards.
