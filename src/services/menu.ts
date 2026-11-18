import { ApiError } from './api.ts'

export interface MenuCategory {
  category_id: number
  name: string
  color: string | null
}

export interface MenuCategoriesResponse {
  categories: MenuCategory[]
}

export interface MenuTag {
  tag_id: number
  name: string
}

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
  category?: MenuCategory | null
  is_featured?: boolean
  is_new?: boolean
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

export interface MenuFilterParams {
  q?: string
  tagIds?: number[]
  categoryId?: number | null
  uncategorized?: boolean
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nullableString(value: unknown): boolean {
  return value === null || typeof value === 'string'
}

function optionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === 'boolean'
}

function category(value: unknown): value is MenuCategory {
  return record(value) && Number.isInteger(value.category_id) && typeof value.name === 'string' && nullableString(value.color)
}

function optionalCategory(value: unknown): boolean {
  return value === undefined || value === null || category(value)
}

function menuTag(value: unknown): value is MenuTag {
  return record(value) && Number.isInteger(value.tag_id) && typeof value.name === 'string'
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
    && optionalCategory(value.category) && optionalBoolean(value.is_featured) && optionalBoolean(value.is_new)
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

export function parseCategories(value: unknown): MenuCategoriesResponse | null {
  if (value === null) return null
  if (!record(value) || !Array.isArray(value.categories) || !value.categories.every(category)) {
    throw new ApiError('La respuesta de categorías no coincide con el contrato público esperado.')
  }
  return value as unknown as MenuCategoriesResponse
}

export function parseMenuTags(value: unknown): MenuTag[] | null {
  if (value === null) return null
  if (!Array.isArray(value) || !value.every(menuTag)) {
    throw new ApiError('La respuesta de etiquetas del menú no coincide con el contrato público esperado.')
  }
  return value as MenuTag[]
}

export function buildMenuQueryPath(filters: MenuFilterParams = {}): string {
  const params = new URLSearchParams()
  const q = filters.q?.trim()
  if (q) params.set('q', q)
  if (filters.uncategorized) {
    params.set('uncategorized', 'true')
  } else if (typeof filters.categoryId === 'number' && filters.categoryId > 0) {
    params.set('category_id', String(filters.categoryId))
  }
  if (Array.isArray(filters.tagIds)) {
    for (const id of filters.tagIds) {
      if (Number.isInteger(id) && id > 0) {
        params.append('tag_id', String(id))
      }
    }
  }
  const qs = params.toString()
  return qs ? `/api/menu?${qs}` : '/api/menu'
}

export function formatPrice(price: string | null, currency: string): string {
  return price === null ? 'Precio no informado' : `${price} ${currency}`
}

export function sumMenuPrices(prices: (string | null)[]): string | null {
  const decimals: { units: bigint; scale: number }[] = []
  for (const price of prices) {
    if (price === null || !/^\d+(\.\d+)?$/.test(price)) return null
    const [whole, fraction = ''] = price.split('.')
    decimals.push({ units: BigInt(whole + fraction), scale: fraction.length })
  }

  const scale = decimals.reduce((max, decimal) => Math.max(max, decimal.scale), 2)
  const total = decimals.reduce((sum, decimal) => sum + decimal.units * 10n ** BigInt(scale - decimal.scale), 0n)
  const amount = total.toString().padStart(scale + 1, '0')
  return `${amount.slice(0, -scale)}.${amount.slice(-scale)}`
}

export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null
  const trimmed = url.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed
  }
  const metaEnv = (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string; VITE_API_URL?: string } }).env
  const rawBase = metaEnv?.VITE_API_BASE_URL?.trim() || metaEnv?.VITE_API_URL?.trim() || 'https://mitbol-backend.onrender.com'
  const base = rawBase.replace(/\/+$/, '')
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return `${base}${path}`
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

export function getProductImageUrls(item: MenuProduct, selectedVariant?: MenuVariant | null): string[] {
  const urls = new Set<string>()
  const add = (value: unknown) => {
    if (typeof value !== 'string') return
    const url = resolveMediaUrl(value)
    if (url) urls.add(url)
  }
  const addVariant = (variant: MenuVariant) => {
    add(variant.image_url)
    for (const photo of variant.images ?? []) {
      add(record(photo) ? photo.image_url : photo)
    }
  }

  if (selectedVariant) {
    addVariant(selectedVariant)
  } else {
    add(item.image_url)
    item.variants.forEach(addVariant)
  }
  return [...urls]
}

export function getRepresentativeImage(item: MenuProduct, selectedVariant?: MenuVariant | null): string | null {
  return getProductImageUrls(item, selectedVariant)[0] ?? null
}

export function getVariantTagNames(v: MenuVariant | null | undefined): string[] {
  if (!v || !Array.isArray(v.tags)) return []
  const names: string[] = []
  for (const t of v.tags) {
    if (typeof t === 'string' && t.trim()) {
      names.push(t.trim())
    } else if (record(t) && typeof t.name === 'string' && t.name.trim()) {
      names.push(t.name.trim())
    }
  }
  return Array.from(new Set(names))
}

export function getProductTagNames(item: MenuProduct): string[] {
  const all = new Set<string>()
  for (const v of item.variants) {
    for (const name of getVariantTagNames(v)) {
      all.add(name)
    }
  }
  return Array.from(all)
}

export function normalizeVariantModifiers(rawModifiers?: unknown[], variantId?: number): NormalizedModifierGroup[] {
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
      const isAvailable = opt.can_order !== false && opt.is_available !== false && opt.is_active !== false

      return [{
        id: String(opt.product_complement_id ?? opt.complement_id ?? opt.id ?? `variant-${variantId}-option-${modIdx}-${optIdx}`),
        name: opt.name,
        price: priceStr,
        isAvailable,
      }]
    })

    return [{
      id: String(mod.product_modifier_id ?? mod.modifier_id ?? mod.id ?? `variant-${variantId}-group-${modIdx}`),
      name: mod.name,
      isAvailable: mod.can_order !== false && mod.is_available !== false && mod.is_active !== false,
      complements,
    }]
  })
}