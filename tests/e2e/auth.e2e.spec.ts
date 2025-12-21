import { test, expect } from '@playwright/test';

test('rejects unauthenticated access to /api/auth/me', async ({ request }) => {
  const res = await request.get('/api/auth/me');
  expect(res.status()).toBe(401);
});

test('allows login and access to protected route', async ({ request }) => {
  const loginRes = await request.post('/api/auth/login', {
    data: {
      email: process.env.E2E_EMAIL,
      password: process.env.E2E_PASSWORD
    }
  });

  expect(loginRes.status()).toBe(200);

  const body = await loginRes.json();
  expect(body.token).toBeTruthy();

  const meRes = await request.get('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${body.token}`
    }
  });

  expect(meRes.status()).toBe(200);
});
