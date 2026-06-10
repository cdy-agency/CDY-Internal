import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

async function proxyRequest(
  request: NextRequest,
  params: { path: string[] },
): Promise<NextResponse> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const path = params.path.join('/');
  const url = new URL(request.url);
  const targetUrl = `${API_URL}/${path}${url.search}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const body = await request.text();
    if (body) {
      init.body = body;
    }
  }

  try {
    const response = await fetch(targetUrl, init);
    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
      },
    });
  } catch {
    return NextResponse.json(
      { message: 'API request failed', statusCode: 500, data: null },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: { path: string[] } },
): Promise<NextResponse> {
  return proxyRequest(request, context.params);
}

export async function POST(
  request: NextRequest,
  context: { params: { path: string[] } },
): Promise<NextResponse> {
  return proxyRequest(request, context.params);
}

export async function PUT(
  request: NextRequest,
  context: { params: { path: string[] } },
): Promise<NextResponse> {
  return proxyRequest(request, context.params);
}

export async function PATCH(
  request: NextRequest,
  context: { params: { path: string[] } },
): Promise<NextResponse> {
  return proxyRequest(request, context.params);
}

export async function DELETE(
  request: NextRequest,
  context: { params: { path: string[] } },
): Promise<NextResponse> {
  return proxyRequest(request, context.params);
}
