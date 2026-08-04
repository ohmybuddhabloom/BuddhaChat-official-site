import { Buffer } from 'node:buffer'
import {
  isSmartLinkRequest,
  masterSlugFromHost,
  masterUpstreamUrl,
  smartLinkUpstreamUrl,
} from '../lib/routing.js'

function requestHost(request) {
  return String(request.headers['x-forwarded-host'] || request.headers.host || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '')
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = []
    request.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    request.on('end', () => resolve(Buffer.concat(chunks)))
    request.on('error', reject)
  })
}

async function proxySmartLinkRequest(request, response) {
  const method = request.method === 'HEAD' ? 'HEAD' : request.method === 'POST' ? 'POST' : 'GET'
  const body = method === 'POST' ? await readRequestBody(request) : undefined
  const headers = {
    accept: request.headers.accept || 'application/json',
    'user-agent': request.headers['user-agent'] || 'buddhachat-master-router',
  }
  if (request.headers['content-type']) headers['content-type'] = request.headers['content-type']
  if (request.headers['x-forwarded-for']) headers['x-forwarded-for'] = request.headers['x-forwarded-for']

  const upstream = await fetch(smartLinkUpstreamUrl(request.url), {
    method,
    headers,
    body,
  })
  const responseBody =
    method === 'HEAD' ? null : Buffer.from(await upstream.arrayBuffer())

  for (const header of ['cache-control', 'content-type', 'location', 'x-robots-tag']) {
    const value = upstream.headers.get(header)
    if (value) response.setHeader(header, value)
  }
  return response.status(upstream.status).send(responseBody)
}

export default async function handler(request, response) {
  const requestUrl = new URL(request.url, 'https://placeholder.local')
  const host = requestHost(request)
  if (isSmartLinkRequest(host, requestUrl.pathname)) {
    return proxySmartLinkRequest(request, response)
  }

  const slug = masterSlugFromHost(host)
  if (!slug || requestUrl.pathname !== '/') {
    return response.status(404).send('Not Found')
  }

  const upstream = await fetch(masterUpstreamUrl(slug, request.url), {
    method: request.method === 'HEAD' ? 'HEAD' : 'GET',
    headers: { accept: request.headers.accept || 'text/html' },
  })
  const body =
    request.method === 'HEAD' ? null : Buffer.from(await upstream.arrayBuffer())

  for (const header of ['cache-control', 'content-type', 'x-robots-tag']) {
    const value = upstream.headers.get(header)
    if (value) response.setHeader(header, value)
  }
  return response.status(upstream.status).send(body)
}
