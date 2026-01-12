import jwt, { JwtPayload } from "jsonwebtoken"
import { cookies } from "next/headers"

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET!
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET!

export function signAccessToken(userInfo: object) {
  return jwt.sign(userInfo, ACCESS_SECRET, {
    expiresIn: "15m",
  })
}

export function signRefreshToken(userInfo: object) {
  return jwt.sign(userInfo, REFRESH_SECRET, {
    expiresIn: "7d",
  })
}

export interface TokenPayload {
  sub: string
  email: string

}

export function verifyRefreshToken(refreshToken: string): TokenPayload & JwtPayload {
  return jwt.verify(refreshToken, REFRESH_SECRET) as TokenPayload & JwtPayload
}

export function verifyAccessToken(token: string): TokenPayload & JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload & JwtPayload;
}

export async function getCurrUserId(req: Request) {
 const auth = req.headers.get("Authorization") ?? "";
 console.log(auth)
  if (!auth.startsWith("Bearer ")) return null;
  
  const token = auth.slice(7);
  const payload = verifyAccessToken(token);
  return payload?.id ?? null;
}