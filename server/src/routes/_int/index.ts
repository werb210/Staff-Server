import express = require('express');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/build', (_req, res) => {
  res.json({ version: process.env.npm_package_version || 'dev', environment: process.env.NODE_ENV || 'development' });
});

router.get('/routes', (_req, res) => {
  res.json({
    routes: [
      '/_int/health',
      '/_int/build',
      '/_int/routes',
      '/auth/login',
      '/auth/logout',
      '/auth/refresh',
      '/auth/reset',
      '/auth/otp/verify',
      '/users/me',
      '/users',
      '/users/profile',
      '/sms/otp',
      '/documents',
    ],
  });
});

export = router;
