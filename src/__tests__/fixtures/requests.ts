import { NextRequest } from 'next/server'

type RequestOptions = {
  url?: string
  headers?: Record<string, string>
  method?: string
}

export function createNextRequest(options: RequestOptions = {}) {
  const url = options.url ?? 'https://example.com/api/test'
  const headers = new Headers(options.headers ?? {})

  return new NextRequest(url, {
    method: options.method ?? 'GET',
    headers,
  })
}
