import dotenv from 'dotenv';

// Load test env when running tests
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test' });
} else {
  dotenv.config();
}

console.log('[ENV] NODE_ENV:', process.env.NODE_ENV);
