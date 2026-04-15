import { randomUUID } from 'node:crypto'

import {
  buildRevenueCatCheckoutUrl,
  resolveDonationTier,
} from './_lib/revenuecat.js'
import {
  hashIpAddress,
  insertDonationIntent,
  markDonationIntentRedirected,
  normalizeEmail,
  upsertContact,
} from './_lib/supabase.js'
import { consumeRateLimit } from './_lib/rate-limit.js'
import {
  readJsonBody,
  sendError,
  sendJson,
  sendMethodNotAllowed,
} from './_lib/json.js'

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for']

  if (typeof forwardedFor !== 'string') {
    return ''
  }

  return forwardedFor.split(',')[0]?.trim() ?? ''
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res)
    return
  }

  try {
    const body = await readJsonBody(req)
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const selectedTierId =
      typeof body.selectedTierId === 'string' ? body.selectedTierId.trim() : ''
    const pagePath = typeof body.pagePath === 'string' ? body.pagePath : '/'

    if (!isValidEmail(email)) {
      sendError(res, 400, 'A valid email address is required.')
      return
    }

    if (!selectedTierId) {
      sendError(res, 400, 'A fixed donation tier must be selected.')
      return
    }

    const ipHash = hashIpAddress(getClientIp(req))
    const rateLimit = consumeRateLimit({
      key: `donation:${ipHash ?? normalizeEmail(email)}`,
      limit: 4,
      windowMs: 10 * 60_000,
    })

    if (!rateLimit.ok) {
      sendError(res, 429, 'Too many donation attempts. Please try again later.')
      return
    }

    const contact = await upsertContact(email)
    const tier = resolveDonationTier(selectedTierId)
    const donationIntentId = randomUUID()
    const appUserId = `donation_intent:${donationIntentId}`
    const intent = await insertDonationIntent({
      id: donationIntentId,
      contact_id: contact.id,
      selected_tier_id: tier.id,
      display_amount_cents: tier.amountCents,
      currency: tier.currency,
      status: 'initiated',
      app_user_id: appUserId,
      page_path: pagePath.slice(0, 256),
    })

    const checkoutUrl = buildRevenueCatCheckoutUrl({
      appUserId,
      email,
      packageId: tier.packageId,
      donationIntentId,
    })

    await markDonationIntentRedirected(intent.id)

    sendJson(res, 200, {
      ok: true,
      donationIntentId,
      checkoutUrl,
    })
  } catch (error) {
    sendError(
      res,
      500,
      'Unable to start the donation flow right now.',
      error instanceof Error ? error.message : 'Unknown error',
    )
  }
}
