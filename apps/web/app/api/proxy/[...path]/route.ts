import { type NextRequest, NextResponse } from 'next/server';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'https://locusapi-production.up.railway.app').replace(/\/+$/, '');

const FORWARD_HEADERS = ['authorization', 'x-user-id', 'x-user-role', 'content-type', 'accept'];

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await params).path, 'GET');
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await params).path, 'POST');
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await params).path, 'PUT');
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await params).path, 'DELETE');
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

async function proxy(request: NextRequest, pathSegments: string[], method: string) {
  const path = pathSegments.join('/');
  const search = request.nextUrl.search;
  const url = `${API_BASE}/${path}${search}`;

  const headers: Record<string, string> = {};
  FORWARD_HEADERS.forEach((h) => {
    const v = request.headers.get(h);
    if (v) headers[h] = v;
  });

  let body: string | undefined;
  try {
    body = await request.text();
  } catch {
    // no body
  }

  const res = await fetch(url, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: body && ['POST', 'PUT'].includes(method) ? body : undefined,
  });

  const text = await res.text();
  const outHeaders = new Headers();
  res.headers.forEach((v, k) => {
    const lower = k.toLowerCase();
    if (['content-type', 'cache-control'].includes(lower)) outHeaders.set(k, v);
  });

  return new NextResponse(text, {
    status: res.status,
    statusText: res.statusText,
    headers: outHeaders,
  });
}
