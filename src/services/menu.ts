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
