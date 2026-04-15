import { createHash } from 'node:crypto'

import { getRequiredEnv } from './env.js'

const JSON_HEADERS = {
  'Content-Type': 'application/json',
}

export class SupabaseRequestError extends Error {
  constructor(message, statusCode, details) {
    super(message)
    this.name = 'SupabaseRequestError'
    this.statusCode = statusCode
    this.details = details
  }
}

function getSupabaseHeaders(extraHeaders = {}) {
  const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  return {
    ...JSON_HEADERS,
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    ...extraHeaders,
  }
}

async function parseResponse(response) {
  const rawText = await response.text()

  if (!rawText) {
    return null
  }

  try {
    return JSON.parse(rawText)
  } catch {
    return rawText
  }
}

async function supabaseRequest(pathname, {
  method = 'GET',
  query = {},
  body,
  headers,
} = {}) {
  const supabaseUrl = getRequiredEnv('SUPABASE_URL')
  const url = new URL(`/rest/v1/${pathname}`, supabaseUrl)

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  }

  const response = await fetch(url, {
    method,
    headers: getSupabaseHeaders(headers),
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const payload = await parseResponse(response)

  if (!response.ok) {
    throw new SupabaseRequestError(
      `Supabase request failed for ${pathname}`,
      response.status,
      payload,
    )
  }

  return payload
}

export function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

export function hashIpAddress(ipAddress) {
  if (!ipAddress) {
    return null
  }

  return createHash('sha256').update(ipAddress).digest('hex')
}

export async function upsertContact(email) {
  const emailNormalized = normalizeEmail(email)
  const existingRows = await supabaseRequest('contacts', {
    query: {
      select: 'id,submission_count',
      email_normalized: `eq.${emailNormalized}`,
    },
  })

  const now = new Date().toISOString()

  if (existingRows?.length) {
    const [contact] = existingRows
    const updatedRows = await supabaseRequest('contacts', {
      method: 'PATCH',
      query: {
        id: `eq.${contact.id}`,
        select: 'id,email_normalized,submission_count',
      },
      body: {
        email_original: email.trim(),
        last_seen_at: now,
        submission_count: Number(contact.submission_count ?? 0) + 1,
      },
      headers: {
        Prefer: 'return=representation',
      },
    })

    return updatedRows?.[0] ?? {
      id: contact.id,
      email_normalized: emailNormalized,
      submission_count: Number(contact.submission_count ?? 0) + 1,
    }
  }

  const insertedRows = await supabaseRequest('contacts', {
    method: 'POST',
    body: {
      email_normalized: emailNormalized,
      email_original: email.trim(),
      first_seen_at: now,
      last_seen_at: now,
      submission_count: 1,
    },
    headers: {
      Prefer: 'return=representation',
    },
  })

  return insertedRows?.[0]
}

export async function insertChatPrompt(record) {
  const insertedRows = await supabaseRequest('chat_prompts', {
    method: 'POST',
    body: record,
    headers: {
      Prefer: 'return=representation',
    },
  })

  return insertedRows?.[0]
}

export async function insertDownloadSubmission(record) {
  const insertedRows = await supabaseRequest('download_submissions', {
    method: 'POST',
    body: record,
    headers: {
      Prefer: 'return=representation',
    },
  })

  return insertedRows?.[0]
}

export async function insertDonationIntent(record) {
  const insertedRows = await supabaseRequest('donation_intents', {
    method: 'POST',
    body: record,
    headers: {
      Prefer: 'return=representation',
    },
  })

  return insertedRows?.[0]
}

export async function markDonationIntentRedirected(id) {
  const updatedRows = await supabaseRequest('donation_intents', {
    method: 'PATCH',
    query: {
      id: `eq.${id}`,
      select: 'id,status,redirected_at',
    },
    body: {
      status: 'redirected',
      redirected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    headers: {
      Prefer: 'return=representation',
    },
  })

  return updatedRows?.[0]
}

export async function findDonationIntentByAppUserId(appUserId) {
  const rows = await supabaseRequest('donation_intents', {
    query: {
      select: 'id,status,app_user_id',
      app_user_id: `eq.${appUserId}`,
      limit: '1',
    },
  })

  return rows?.[0] ?? null
}

export async function findDonationEventByProviderId(providerEventId) {
  const rows = await supabaseRequest('donation_events', {
    query: {
      select: 'id,provider_event_id',
      provider_event_id: `eq.${providerEventId}`,
      limit: '1',
    },
  })

  return rows?.[0] ?? null
}

export async function insertDonationEvent(record) {
  const insertedRows = await supabaseRequest('donation_events', {
    method: 'POST',
    body: record,
    headers: {
      Prefer: 'return=representation',
    },
  })

  return insertedRows?.[0]
}

export async function updateDonationIntentStatus(id, updates) {
  const updatedRows = await supabaseRequest('donation_intents', {
    method: 'PATCH',
    query: {
      id: `eq.${id}`,
      select: 'id,status,completed_at,updated_at',
    },
    body: {
      ...updates,
      updated_at: new Date().toISOString(),
    },
    headers: {
      Prefer: 'return=representation',
    },
  })

  return updatedRows?.[0]
}
