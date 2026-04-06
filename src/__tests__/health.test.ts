import request from 'supertest';
import app from '../app/app';

describe('Health', () => {
  it('should return ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});
