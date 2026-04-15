import fs from 'node:fs'
import path from 'node:path'

import { createSceneSnapshot, sanitizeScene } from '../../src/content/sunyata.js'
import { getOptionalEnv, getRequiredEnv } from './env.js'

function readSceneTierConfig() {
  const scenePath = path.join(
    globalThis.process?.cwd?.() ?? '.',
    'public',
    'editor-state',
    'scene.json',
  )
  const fallbackScene = createSceneSnapshot()

  try {
    const rawScene = JSON.parse(fs.readFileSync(scenePath, 'utf8'))
    return sanitizeScene({
      ...fallbackScene,
      donation: {
        ...fallbackScene.donation,
        ...rawScene?.donation,
        layout: {
          ...fallbackScene.donation.layout,
          ...rawScene?.donation?.layout,
        },
      },
    }).donation.tiers
  } catch {
    return fallbackScene.donation.tiers
  }
}

function parsePackageMap(rawValue) {
  if (!rawValue) {
    return {}
  }

  try {
    const parsed = JSON.parse(rawValue)
    return typeof parsed === 'object' && parsed ? parsed : {}
  } catch {
    throw new Error('REVENUECAT_PACKAGE_MAP_JSON must be valid JSON')
  }
}

function parseAmountToCents(amount) {
  const numericAmount = Number.parseFloat(String(amount))

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error(`Invalid donation amount: ${amount}`)
  }

  return Math.round(numericAmount * 100)
}

export function getDonationTierCatalog() {
  const sceneTiers = readSceneTierConfig()
  const packageMap = parsePackageMap(
    getOptionalEnv('REVENUECAT_PACKAGE_MAP_JSON', '{}'),
  )

  return sceneTiers.map((tier, index) => {
    const tierId = tier.id ?? tier.amount ?? `tier-${index + 1}`

    return {
      id: tierId,
      label: tier.label ?? String(tier.amount),
      amountCents: parseAmountToCents(tier.amount),
      currency: 'USD',
      packageId: packageMap[tierId] ?? null,
    }
  })
}

export function resolveDonationTier(selectedTierId) {
  const tier = getDonationTierCatalog().find((item) => item.id === selectedTierId)

  if (!tier) {
    throw new Error('Unknown donation tier')
  }

  if (!tier.packageId) {
    throw new Error(`Missing RevenueCat package mapping for tier: ${selectedTierId}`)
  }

  return tier
}

export function buildRevenueCatCheckoutUrl({
  appUserId,
  email,
  packageId,
  donationIntentId,
}) {
  const basePurchaseLink = getRequiredEnv('REVENUECAT_WEB_PURCHASE_LINK')
  const checkoutUrl = new URL(basePurchaseLink.endsWith('/')
    ? `${basePurchaseLink}${encodeURIComponent(appUserId)}`
    : `${basePurchaseLink}/${encodeURIComponent(appUserId)}`)

  checkoutUrl.searchParams.set('email', email)
  checkoutUrl.searchParams.set('package_id', packageId)
  checkoutUrl.searchParams.set('utm_source', 'buddhachat-site')
  checkoutUrl.searchParams.set('utm_medium', 'donation')
  checkoutUrl.searchParams.set('utm_campaign', 'sacred-offering')
  checkoutUrl.searchParams.set('utm_content', donationIntentId)

  if (getOptionalEnv('REVENUECAT_SKIP_PURCHASE_SUCCESS', 'false') === 'true') {
    checkoutUrl.searchParams.set('skip_purchase_success', 'true')
  }

  return checkoutUrl.toString()
}

export function mapRevenueCatEventToDonationStatus(eventType) {
  switch (eventType) {
    case 'INITIAL_PURCHASE':
    case 'NON_RENEWING_PURCHASE':
    case 'RENEWAL':
      return 'completed'
    case 'CANCELLATION':
    case 'EXPIRATION':
      return 'failed'
    default:
      return null
  }
}
