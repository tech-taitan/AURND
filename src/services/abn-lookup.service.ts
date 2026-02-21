import { LRUCache } from 'lru-cache'

export interface AbnLookupResult {
  abn: string
  companyName: string
  entityType?: string
  status?: string
  gstRegistered?: boolean
  address?: {
    state?: string
    postcode?: string
    street?: string
    suburb?: string
    country?: string
  }
}

const cache = new LRUCache<string, AbnLookupResult>({
  max: 200,
  ttl: 1000 * 60 * 60 * 24, // 24 hours
})

function normalizeAbn(abn: string) {
  return abn.replace(/\s+/g, '')
}

function parseJsonp(payload: string) {
  const trimmed = payload.trim()
  const match = trimmed.match(/^[^(]*\((.*)\)\s*;?$/)
  if (!match) {
    throw new Error('Invalid ABN lookup response')
  }
  return match[1]
}

export async function lookupAbn(abnInput: string): Promise<AbnLookupResult> {
  const abn = normalizeAbn(abnInput)
  if (!/^\d{11}$/.test(abn)) {
    throw new Error('ABN must be 11 digits')
  }

  const cached = cache.get(abn)
  if (cached) {
    return cached
  }

  const guid = process.env.ABR_GUID
  if (!guid) {
    throw new Error('ABR_GUID is not configured for ABN lookup')
  }

  const url = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${abn}&guid=${guid}&callback=callback`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Failed to fetch ABN details')
  }

  const text = await response.text()
  const jsonText = parseJsonp(text)
  const data = JSON.parse(jsonText) as Record<string, string>

  if (data.AbnStatus === 'Cancelled' || data.AbnStatus === 'NotCurrentlyRegistered') {
    throw new Error('ABN is not currently registered')
  }

  const result: AbnLookupResult = {
    abn,
    companyName: data.EntityName || data.MainEntityName || data.BusinessName || 'Unknown entity',
    entityType: data.EntityTypeName,
    status: data.AbnStatus,
    gstRegistered: Boolean(data.Gst),
    address: {
      state: data.State,
      postcode: data.Postcode,
      suburb: data.Suburb,
      street: data.Street,
      country: 'Australia',
    },
  }

  cache.set(abn, result)
  return result
}
