import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || 'fallback-secret-change-me')
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 dias

export async function createSession(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + SESSION_DURATION) / 1000))
    .sign(SECRET)
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, SECRET)
    return true
  } catch {
    return false
  }
}
