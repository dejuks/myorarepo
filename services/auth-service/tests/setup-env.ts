// Ensures envalid validation passes when tests import modules that read @config/env,
// without requiring a real .env file or live infrastructure in CI.
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_USERNAME = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_DATABASE = 'auth_db_test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_at_least_32_characters_long';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_at_least_32_characters_long';
process.env.RABBITMQ_URL = 'amqp://guest:guest@localhost:5672';
