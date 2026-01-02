import jwt, { JwtPayload } from "jsonwebtoken"
import {cookies} from "next/headers"
import { NextResponse } from "next/server"


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

export async function getTokenFromRequest(req: Request): Promise<string | null> {
  // 1) Authorization header (Bearer)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }

  // 2) httpOnly cookie fallback (server-side) — NOTE the await
  const cookieStore = await cookies(); // <- await here fixes the TS error
  const cookieToken = cookieStore.get("auth_token")?.value ?? null;
  if (cookieToken) return cookieToken;

  return null;
}

export async function requireUserFromRequest(req: Request): Promise<string> {
  const token = await getTokenFromRequest(req);
  if (!token) throw NextResponse.json({ msg: "Unauthorized" }, { status: 401 });

  const payload = verifyAccessToken(token);
  if (!payload || !payload.sub) {
    throw NextResponse.json({ msg: "Unauthorized" }, { status: 401 });
  }

  return String(payload.sub);
}