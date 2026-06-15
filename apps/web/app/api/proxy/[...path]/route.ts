import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3251/api/v1';

async function proxyRequest(
  request: NextRequest,
  params: { path: string[] },
): Promise<NextResponse> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const path = params.path.join('/');
  const url = new URL(request.url);
  const targetUrl = `${API_URL}/${path}${url.search}`;
console.log('Proxying request to:', targetUrl); // Log the target URL for debugging
  const headers: Record<string, string> = {};

  const contentType = request.headers.get('Content-Type');
  if (contentType) {
    headers['Content-Type'] = contentType;
  } else if (request.method !== 'GET' && request.method !== 'HEAD') {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const isMultipart = contentType?.includes('multipart/form-data');
    if (isMultipart) {
      init.body = await request.arrayBuffer();
    } else {
      const body = await request.text();
      if (body) {
        init.body = body;
      }
    }
  }

  try {
    const response = await fetch(targetUrl, init);
    const responseContentType =
      response.headers.get('Content-Type') ?? 'application/json';

    if (responseContentType.includes('application/pdf')) {
      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        status: response.status,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition':
            response.headers.get('Content-Disposition') ??
            'attachment; filename="invoice.pdf"',
        },
      });
    }

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': responseContentType },
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
