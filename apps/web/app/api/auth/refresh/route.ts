import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://api:3251/api/v1';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  if (!refreshToken) {
    return NextResponse.json({ message: 'No refresh token' }, { status: 401 });
  }

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      const body = NextResponse.json({ message: 'Refresh failed' }, { status: 401 });
      body.cookies.delete(AUTH_COOKIE_NAME);
      body.cookies.delete(REFRESH_COOKIE_NAME);
      return body;
    }

    const result = await response.json();
    const { accessToken } = result.data as { accessToken: string };

    const secure = process.env.COOKIES_SECURE === 'true';
    const nextResponse = NextResponse.json({ ok: true });

    nextResponse.cookies.set(AUTH_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 60 * 15,
      path: '/',
    });

    return nextResponse;
  } catch {
    return NextResponse.json({ message: 'Refresh failed' }, { status: 500 });
  }
}
