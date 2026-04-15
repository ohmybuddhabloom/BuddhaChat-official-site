import {
  findDonationEventByProviderId,
  findDonationIntentByAppUserId,
  insertDonationEvent,
  updateDonationIntentStatus,
} from './_lib/supabase.js'
import {
  mapRevenueCatEventToDonationStatus,
} from './_lib/revenuecat.js'
import { getRequiredEnv } from './_lib/env.js'
import {
  readJsonBody,
  sendError,
  sendJson,
  sendMethodNotAllowed,
} from './_lib/json.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res)
    return
  }

  const expectedAuthorization = getRequiredEnv('REVENUECAT_WEBHOOK_AUTH')
  const authorizationHeader = req.headers.authorization ?? ''

  if (authorizationHeader !== expectedAuthorization) {
    sendError(res, 401, 'Unauthorized webhook request.')
    return
  }

  try {
    const body = await readJsonBody(req)
    const event = body?.event

    if (!event || typeof event !== 'object') {
      sendError(res, 400, 'Webhook payload is missing an event object.')
      return
    }

    if (event.type === 'TEST') {
      sendJson(res, 200, { ok: true, ignored: true })
      return
    }

    const providerEventId = typeof event.id === 'string' ? event.id : ''

    if (!providerEventId) {
      sendError(res, 400, 'Webhook event id is required.')
      return
    }

    const existingEvent = await findDonationEventByProviderId(providerEventId)

    if (existingEvent) {
      sendJson(res, 200, { ok: true, duplicate: true })
      return
    }

    const appUserId =
      typeof event.app_user_id === 'string' ? event.app_user_id : ''

    if (!appUserId.startsWith('donation_intent:')) {
      sendJson(res, 200, { ok: true, ignored: true })
      return
    }

    const donationIntent = await findDonationIntentByAppUserId(appUserId)

    if (!donationIntent) {
      sendJson(res, 202, { ok: true, ignored: true })
      return
    }

    await insertDonationEvent({
      donation_intent_id: donationIntent.id,
      provider_event_id: providerEventId,
      event_type: event.type ?? 'UNKNOWN',
      payload: event,
    })

    const mappedStatus = mapRevenueCatEventToDonationStatus(event.type)

    if (mappedStatus) {
      const nextUpdates = {
        status: mappedStatus,
      }

      if (mappedStatus === 'completed') {
        nextUpdates.completed_at = new Date(
          Number(event.event_timestamp_ms ?? Date.now()),
        ).toISOString()
      }

      if (typeof event.original_app_user_id === 'string') {
        nextUpdates.revenuecat_customer_id = event.original_app_user_id
      }

      await updateDonationIntentStatus(donationIntent.id, nextUpdates)
    }

    sendJson(res, 200, { ok: true })
  } catch (error) {
    sendError(
      res,
      500,
      'Unable to process RevenueCat webhook.',
      error instanceof Error ? error.message : 'Unknown error',
    )
  }
}
