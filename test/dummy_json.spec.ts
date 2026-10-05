import pactum from 'pactum';
import { StatusCodes } from 'http-status-codes';
import { SimpleReporter } from '../simple-reporter';

describe('DummyJSON', () => {
  const p = pactum;
  const rep = SimpleReporter;
  const baseUrl = 'https://dummyjson.com';

  p.request.setDefaultTimeout(30000);

  beforeAll(() => p.reporter.add(rep));
  afterAll(() => p.reporter.end());

  describe('PRODUCTS', () => {
    it('buscar um produto', async () => {
      await p
        .spec()
        .get(`${baseUrl}/products/1`)
        .expectStatus(StatusCodes.OK)
        .expectJsonLike({
          id: 1
        });
    });

    it('produto não encontrado', async () => {
      await p
        .spec()
        .get(`${baseUrl}/products/99999`)
        .expectStatus(StatusCodes.NOT_FOUND);
    });

    it('criar um novo produto', async () => {
      await p
        .spec()
        .post(`${baseUrl}/products/add`)
        .withJson({
          title: 'Produto teste',
          price: 100,
          category: 'teste'
        })
        .expectStatus(StatusCodes.CREATED)
        .expectJsonLike({
          title: 'Produto teste',
          price: 100,
          category: 'teste'
        });
    });
  });
});