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

  afterEach(async () => {
    await app.close();
  });
});
