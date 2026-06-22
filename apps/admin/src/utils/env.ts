const REQUIRED_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const

export function validateEnv() {
  const missing = REQUIRED_VARS.filter(key => !import.meta.env[key])
  if (missing.length) {
    console.error(
      `Missing required environment variables:\n  ${missing.join('\n  ')}\n\n` +
      'Copy apps/admin/.env.example to apps/admin/.env and fill in the values.'
    )
  }
}
