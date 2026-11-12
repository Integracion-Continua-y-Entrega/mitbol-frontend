import { ApiError } from './api.ts'

export interface MenuVariant {
  product_variant_id: number
  name: string
  price: string
  is_available: boolean
  can_order: boolean
  image_url: string | null
  tags: unknown[]
  images?: unknown[]
  modifiers?: unknown[]
}

export interface MenuProduct {
  product_id: number
  name: string
  description: string | null
  image_url: string | null
  is_active: boolean
  is_available: boolean
  can_order: boolean
  price_min: string | null
  price_max: string | null
  has_price_range: boolean
  variants: MenuVariant[]
}

export interface MenuResponse { currency: string; products: MenuProduct[] }
export interface ProductResponse { currency: string; product: MenuProduct | null }

export interface NormalizedComplement {
  id: string
  name: string
  price: string | null
  isAvailable: boolean
}

export interface NormalizedModifierGroup {
  id: string
  name: string
  isAvailable: boolean
  complements: NormalizedComplement[]
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nullableString(value: unknown): boolean {
  return value === null || typeof value === 'string'
}

function variant(value: unknown): boolean {
  return record(value) && Number.isInteger(value.product_variant_id) && typeof value.name === 'string'
    && typeof value.price === 'string' && typeof value.is_available === 'boolean'
    && typeof value.can_order === 'boolean' && nullableString(value.image_url) && Array.isArray(value.tags)
}

function product(value: unknown): boolean {
  return record(value) && Number.isInteger(value.product_id) && typeof value.name === 'string'
    && nullableString(value.description) && nullableString(value.image_url)
    && typeof value.is_active === 'boolean' && typeof value.is_available === 'boolean'
    && typeof value.can_order === 'boolean' && nullableString(value.price_min) && nullableString(value.price_max)
    && typeof value.has_price_range === 'boolean' && Array.isArray(value.variants) && value.variants.every(variant)
}

export function parseMenu(value: unknown): MenuResponse | null {
  if (value === null) return null
  if (!record(value) || typeof value.currency !== 'string' || !Array.isArray(value.products) || !value.products.every(product)) {
    throw new ApiError('La respuesta del catálogo no coincide con el contrato público esperado.')
  }
  return value as unknown as MenuResponse
}

export function parseProduct(value: unknown): ProductResponse | null {
  if (value === null) return null
  if (!record(value) || typeof value.currency !== 'string' || (value.product !== null && !product(value.product))) {
    throw new ApiError('La respuesta del detalle no coincide con el contrato público esperado.')
  }
  return value as unknown as ProductResponse
}

export function parseHealth(value: unknown): unknown { return value }

export function formatPrice(price: string | null, currency: string): string {
  // Se conserva la precisión decimal enviada por el backend, sin asumir moneda.
  return price === null ? 'Precio no informado' : `${price} ${currency}`
}

export function formatRepresentativePrice(item: MenuProduct, currency: string): string {
  if (item.price_min === null) {
    if (item.variants.length === 1) {
      return formatPrice(item.variants[0].price, currency)
    }
    return 'Precio no informado'
  }
  if (item.has_price_range) {
    return `Desde ${formatPrice(item.price_min, currency)}`
  }
  return formatPrice(item.price_min, currency)
}

export function getRepresentativeImage(item: MenuProduct, selectedVariant?: MenuVariant | null): string | null {
  if (selectedVariant) {
    if (selectedVariant.image_url) return selectedVariant.image_url
    if (Array.isArray(selectedVariant.images)) {
      for (const img of selectedVariant.images) {
        if (typeof img === 'string' && img.trim()) return img
        if (record(img) && typeof img.image_url === 'string' && img.image_url.trim()) return img.image_url
      }
    }
  }
  if (item.image_url) return item.image_url
  for (const v of item.variants) {
    if (v.image_url) return v.image_url
  }
  return null
}

export function normalizeVariantModifiers(rawModifiers?: unknown[]): NormalizedModifierGroup[] {
  if (!Array.isArray(rawModifiers)) return []

  return rawModifiers.flatMap((mod, modIdx) => {
    if (!record(mod) || typeof mod.name !== 'string') return []

    const rawOptions = Array.isArray(mod.complements)
      ? mod.complements
      : Array.isArray(mod.options)
        ? mod.options
        : []

    const complements: NormalizedComplement[] = rawOptions.flatMap((opt, optIdx) => {
      if (!record(opt) || typeof opt.name !== 'string') return []
      const rawPrice = opt.price ?? opt.additional_price ?? opt.extra_price ?? null
      const priceStr = typeof rawPrice === 'string'
        ? rawPrice
        : typeof rawPrice === 'number'
          ? rawPrice.toFixed(2)
          : null
      const isAvailable = typeof opt.is_available === 'boolean'
        ? opt.is_available
        : typeof opt.is_active === 'boolean'
          ? opt.is_active
          : true

      return [{
        id: String(opt.product_complement_id ?? opt.complement_id ?? opt.id ?? `${modIdx}-${optIdx}`),
        name: opt.name,
        price: priceStr,
        isAvailable,
      }]
    })

    const groupAvailable = typeof mod.is_available === 'boolean'
      ? mod.is_available
      : typeof mod.is_active === 'boolean'
        ? mod.is_active
        : true

    return [{
      id: String(mod.product_modifier_id ?? mod.modifier_id ?? mod.id ?? modIdx),
      name: mod.name,
      isAvailable: groupAvailable,
      complements,
    }]
  })
}