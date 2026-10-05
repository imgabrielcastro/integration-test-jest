import pactum from 'pactum';
import { StatusCodes } from 'http-status-codes';
import { SimpleReporter } from '../simple-reporter';
import { faker } from '@faker-js/faker';
import { like, string } from 'pactum-matchers';

/**
 * Testes de integração da API Restful Booker (sistema de reservas de hotel).
 * Documentação: https://restful-booker.herokuapp.com/apidoc/index.html
 *
 * Fluxo coberto: health check, autenticação, CRUD completo de reservas
 * (criar, buscar, listar com filtro, atualizar, atualizar parcialmente e excluir)
 * e cenários negativos (credenciais inválidas, alteração sem token e
 * busca de reserva inexistente).
 */
describe('Restful Booker API', () => {
  const p = pactum;
  const rep = SimpleReporter;
  const baseUrl = 'https://restful-booker.herokuapp.com';

  const bookingSchema = {
    type: 'object',
    required: [
      'firstname',
      'lastname',
      'totalprice',
      'depositpaid',
      'bookingdates'
    ],
    properties: {
      firstname: { type: 'string' },
      lastname: { type: 'string' },
      totalprice: { type: 'number' },
      depositpaid: { type: 'boolean' },
      bookingdates: {
        type: 'object',
        required: ['checkin', 'checkout'],
        properties: {
          checkin: { type: 'string' },
          checkout: { type: 'string' }
        }
      },
      additionalneeds: { type: 'string' }
    }
  };

  const booking = {
    firstname: faker.person.firstName() + faker.string.alpha(6),
    lastname: faker.person.lastName(),
    totalprice: faker.number.int({ min: 100, max: 1000 }),
    depositpaid: true,
    bookingdates: {
      checkin: '2026-11-10',
      checkout: '2026-11-15'
    },
    additionalneeds: 'Breakfast'
  };

  let token = '';
  let bookingId = 0;

  p.request.setDefaultTimeout(60000);

  beforeAll(async () => {
    p.reporter.add(rep);

    token = await p
      .spec()
      .post(`${baseUrl}/auth`)
      .withJson({ username: 'admin', password: 'password123' })
      .expectStatus(StatusCodes.OK)
      .returns('token');
  });

  afterAll(() => p.reporter.end());

  describe('Health check', () => {
    it('Deve confirmar que a API está no ar (GET /ping retorna 201)', async () => {
      await p.spec().get(`${baseUrl}/ping`).expectStatus(StatusCodes.CREATED);
    });
  });

  describe('Autenticação', () => {
    it('Deve gerar um token ao autenticar com credenciais válidas', async () => {
      await p
        .spec()
        .post(`${baseUrl}/auth`)
        .withJson({ username: 'admin', password: 'password123' })
        .expectStatus(StatusCodes.OK)
        .expectJsonMatch({ token: string() });
    });

    it('Deve recusar credenciais inválidas com a mensagem "Bad credentials"', async () => {
      await p
        .spec()
        .post(`${baseUrl}/auth`)
        .withJson({ username: 'admin', password: 'senha-errada' })
        .expectStatus(StatusCodes.OK)
        .expectJson({ reason: 'Bad credentials' });
    });
  });

  describe('Reservas (Booking)', () => {
    it('Deve criar uma nova reserva e retornar o id gerado', async () => {
      bookingId = await p
        .spec()
        .post(`${baseUrl}/booking`)
        .withHeaders({ Accept: 'application/json' })
        .withJson(booking)
        .expectStatus(StatusCodes.OK)
        .expectJsonMatch({
          bookingid: like(1),
          booking: booking
        })
        .expectJsonSchema('booking', bookingSchema)
        .returns('bookingid');
    });

    it('Deve buscar a reserva criada pelo id com os mesmos dados enviados', async () => {
      await p
        .spec()
        .get(`${baseUrl}/booking/{id}`)
        .withPathParams('id', bookingId)
        .withHeaders({ Accept: 'application/json' })
        .expectStatus(StatusCodes.OK)
        .expectJson(booking)
        .expectJsonSchema(bookingSchema);
    });

    it('Deve listar a reserva criada ao filtrar pelo nome do hóspede', async () => {
      await p
        .spec()
        .get(`${baseUrl}/booking`)
        .withQueryParams({
          firstname: booking.firstname,
          lastname: booking.lastname
        })
        .expectStatus(StatusCodes.OK)
        .expectJsonLike([{ bookingid: bookingId }]);
    });

    it('Deve atualizar todos os dados da reserva (PUT) usando o token', async () => {
      const reservaAtualizada = {
        ...booking,
        totalprice: 1500,
        depositpaid: false,
        additionalneeds: 'Late checkout'
      };

      await p
        .spec()
        .put(`${baseUrl}/booking/{id}`)
        .withPathParams('id', bookingId)
        .withHeaders({ Accept: 'application/json', Cookie: `token=${token}` })
        .withJson(reservaAtualizada)
        .expectStatus(StatusCodes.OK)
        .expectJson(reservaAtualizada);
    });

    it('Deve atualizar parcialmente a reserva (PATCH) alterando só o nome', async () => {
      await p
        .spec()
        .patch(`${baseUrl}/booking/{id}`)
        .withPathParams('id', bookingId)
        .withHeaders({ Accept: 'application/json', Cookie: `token=${token}` })
        .withJson({ firstname: 'Gabriel', lastname: 'Castro' })
        .expectStatus(StatusCodes.OK)
        .expectJsonLike({
          firstname: 'Gabriel',
          lastname: 'Castro',
          totalprice: 1500,
          bookingdates: booking.bookingdates
        });
    });

    it('Não deve permitir alterar a reserva sem token (403 Forbidden)', async () => {
      await p
        .spec()
        .put(`${baseUrl}/booking/{id}`)
        .withPathParams('id', bookingId)
        .withHeaders({ Accept: 'application/json' })
        .withJson(booking)
        .expectStatus(StatusCodes.FORBIDDEN);
    });

    it('Deve excluir a reserva usando o token', async () => {
      await p
        .spec()
        .delete(`${baseUrl}/booking/{id}`)
        .withPathParams('id', bookingId)
        .withHeaders({ Cookie: `token=${token}` })
        .expectStatus(StatusCodes.CREATED);
    });

    it('Deve retornar 404 ao buscar a reserva excluída', async () => {
      await p
        .spec()
        .get(`${baseUrl}/booking/{id}`)
        .withPathParams('id', bookingId)
        .withHeaders({ Accept: 'application/json' })
        .expectStatus(StatusCodes.NOT_FOUND);
    });
  });
});
