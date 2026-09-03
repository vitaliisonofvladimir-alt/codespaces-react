export function getAllowedOrigin(env = process.env) {
  return env.ALLOWED_ORIGIN || 'http://localhost:3000';
}
