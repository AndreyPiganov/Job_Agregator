import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/modules/app/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok' });
  });

  it('rejects a create request with missing required fields', () => {
    return request(app.getHttpServer()).post('/api/v1/vacancies').send({ title: 'Go developer' }).expect(400);
  });

  it('accepts only an array as the batch request shape', () => {
    return request(app.getHttpServer()).post('/api/v1/vacancies/batch').send({ vacancies: [] }).expect(400);
  });

  it('validates every vacancy in a batch array', () => {
    return request(app.getHttpServer()).post('/api/v1/vacancies/batch').send([{}]).expect(400);
  });

  it('validates auth registration input before gRPC', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'invalid', password: 'strong-password', first_name: 'Ivan', last_name: 'Petrov' })
      .expect(400);
  });

  it('requires a Passport Bearer token for the current principal', () => {
    return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('protects user profile routes with Passport', () => {
    return request(app.getHttpServer()).get('/api/v1/users/me/profile').expect(401);
  });

  it('protects resume routes with Passport', () => {
    return request(app.getHttpServer()).get('/api/v1/users/me/resumes').expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});
