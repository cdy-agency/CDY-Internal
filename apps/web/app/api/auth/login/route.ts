import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://api:3251/api/v1';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    // SECURITY: never log the response body here — it contains the access and
    // refresh tokens in plain text.
    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: result.message ?? 'Login failed' },
        { status: response.status },
      );
    }

    const { accessToken, refreshToken } = result.data;
    const nextResponse = NextResponse.json({ user: result.data.user });

    // Secure cookies by default in production; COOKIES_SECURE=false only for
    // local/plain-HTTP deployments that opt out explicitly.
    const secure =
      process.env.COOKIES_SECURE != null
        ? process.env.COOKIES_SECURE === 'true'
        : process.env.NODE_ENV === 'production';

    nextResponse.cookies.set(AUTH_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 60 * 15,
      path: '/',
    });

    nextResponse.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return nextResponse;
  } catch {
    return NextResponse.json({ message: 'Login failed' }, { status: 500 });
  }
}
