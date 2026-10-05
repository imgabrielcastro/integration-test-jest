# Testes de API com Jest e PactumJS — Restful Booker

> Testes de integração da API pública [Restful Booker](https://restful-booker.herokuapp.com/apidoc/index.html) usando JestJS e PactumJS.

## GitHub Actions

[![Node.js CI](https://github.com/imgabrielcastro/integration-test-jest/actions/workflows/node.js.yml/badge.svg?branch=main)](https://github.com/imgabrielcastro/integration-test-jest/actions/workflows/node.js.yml)

## SonarCloud

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=imgabrielcastro_integration-test-jest&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=imgabrielcastro_integration-test-jest)

## API testada

**Restful Booker** é uma API de reservas de hotel com autenticação por token e CRUD completo de reservas.

- Base URL: `https://restful-booker.herokuapp.com`
- Documentação: https://restful-booker.herokuapp.com/apidoc/index.html

## Cenários de teste

Arquivo: [`test/restful_booker.spec.ts`](test/restful_booker.spec.ts)

Antes de tudo (`beforeAll`), os testes se autenticam em `POST /auth` e guardam o token, que é enviado no cookie `token` das rotas protegidas. Os dados da reserva são gerados com o Faker, então cada execução cria uma reserva nova.

| # | Grupo | Cenário | Requisição | Resultado esperado |
|---|---|---|---|---|
| 1 | Health check | API está no ar | `GET /ping` | Status `201` |
| 2 | Autenticação | Login com credenciais válidas | `POST /auth` | Status `200` e corpo com `token` do tipo string |
| 3 | Autenticação | Login com senha errada | `POST /auth` | Corpo `{ "reason": "Bad credentials" }` |
| 4 | Reservas | Criar reserva | `POST /booking` | Status `200`, `bookingid` gerado, dados iguais aos enviados e corpo válido pelo JSON Schema |
| 5 | Reservas | Buscar reserva por id | `GET /booking/{id}` | Status `200`, mesmos dados enviados e corpo válido pelo JSON Schema |
| 6 | Reservas | Listar reservas filtrando pelo nome | `GET /booking?firstname=&lastname=` | Lista contém o `bookingid` criado |
| 7 | Reservas | Atualizar reserva inteira com token | `PUT /booking/{id}` | Status `200` e corpo com os novos dados |
| 8 | Reservas | Atualizar só o nome com token | `PATCH /booking/{id}` | Status `200`, nome alterado e demais dados mantidos |
| 9 | Reservas (negativo) | Atualizar reserva sem token | `PUT /booking/{id}` | Status `403 Forbidden` |
| 10 | Reservas | Excluir reserva com token | `DELETE /booking/{id}` | Status `201` |
| 11 | Reservas (negativo) | Buscar reserva excluída | `GET /booking/{id}` | Status `404 Not Found` |

### Recursos do PactumJS usados

- `spec()` com `get`, `post`, `put`, `patch` e `delete`
- `withJson`, `withHeaders`, `withPathParams` e `withQueryParams` para montar as requisições
- `expectStatus` para validar o status HTTP
- `expectJson` para comparar o corpo inteiro da resposta
- `expectJsonLike` para comparar só parte do corpo
- `expectJsonMatch` com os matchers `like` e `string` (`pactum-matchers`) para validar tipos
- `expectJsonSchema` para validar a estrutura da reserva com JSON Schema
- `returns` para guardar o `token` e o `bookingid` e usá-los nos testes seguintes
- `reporter` customizado ([`simple-reporter.ts`](simple-reporter.ts)) que anexa request e response ao relatório HTML

## Pipeline

O workflow [`.github/workflows/node.js.yml`](.github/workflows/node.js.yml) roda em todo push e PR para a `main`, e também pode ser disparado manualmente na aba Actions:

1. Prettier: formata e confere a formatação
2. ESLint: análise de código, com relatório em `output/eslint.html`
3. Jest: roda os testes, com relatório em `output/report.html`
4. Upload da pasta `output/` como artifact
5. Análise do SonarCloud

Cobertura de código não se aplica: os testes chamam uma API externa e o projeto não tem código próprio a ser coberto. Por isso ela está excluída em `sonar-project.properties`.

## Como rodar

Pré-requisito: Node.js `v22`

```bash
npm install
npm run ci
```

Os relatórios HTML ficam na pasta `./output`.
