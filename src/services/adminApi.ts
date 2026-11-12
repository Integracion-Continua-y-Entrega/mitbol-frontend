import { API_URL } from './config'

export interface UserResponse {
  account_id: number
  person_id: number
  email: string
  name: string
  roles: string[]
  permissions: string[]
}

export interface SessionResponse {
  user: UserResponse
  expires_at: string
  idle_expires_at: string
}

export interface LoginResponse extends SessionResponse {
  csrf_token: string
}

export interface ProductAvailabilityResponse {
  product_id: number
  is_active: boolean
  is_available: boolean
  can_order: boolean
}

export interface VariantAvailabilityResponse {
  product_variant_id: number
  product_id: number
  is_available: boolean
  is_commercially_available: boolean
  product_is_active: boolean
  product_is_available: boolean
  can_order: boolean
}

export interface DescriptionResponse {
  product_id: number
  description: string | null
}

export interface ImageResponse {
  product_image_id: number
  product_variant_id: number
  image_url: string
  display_order: number
  created_at: string
}

export interface ImageListResponse {
  images: ImageResponse[]
}

export interface TagResponse {
  tag_id: number
  name: string
  created_at?: string
}

export interface TagListResponse {
  tags: TagResponse[]
}

export interface MenuPublicConfigResponse {
  menu_url: string | null
}

const CSRF_STORAGE_KEY = 'mitbol_csrf_token'
export const MENU_SYNC_CHANNEL = 'mitbol_menu_sync'
export const MENU_SYNC_STORAGE_KEY = 'mitbol_menu_updated_at'

export function notifyMenuUpdated() {
  const timestamp = String(Date.now())
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(MENU_SYNC_CHANNEL)
      bc.postMessage({ updatedAt: timestamp })
      bc.close()
    }
  } catch {
    // Ignorar si el navegador restringe BroadcastChannel
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MENU_SYNC_STORAGE_KEY, timestamp)
    }
  } catch {
    // Ignorar errores de almacenamiento
  }
}

let memoryCsrfToken: string | null =
  typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(CSRF_STORAGE_KEY) : null

export function setCsrfToken(token: string | null) {
  memoryCsrfToken = token
  if (typeof sessionStorage !== 'undefined') {
    if (token) {
      sessionStorage.setItem(CSRF_STORAGE_KEY, token)
    } else {
      sessionStorage.removeItem(CSRF_STORAGE_KEY)
    }
  }
}

export function getCsrfToken(): string | null {
  return memoryCsrfToken
}

function buildUrl(path: string): string {
  const base = API_URL.replace(/\/+$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${cleanPath}`
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: unknown }
    if (typeof data.detail === 'string') return data.detail
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((err) => (typeof err === 'object' && err !== null && 'msg' in err ? String(err.msg) : JSON.stringify(err)))
        .join(', ')
    }
  } catch {
    // Respuesta sin cuerpo JSON
  }
  if (response.status === 401) return 'Sesión no iniciada o expirada. Inicia sesión nuevamente.'
  if (response.status === 403) return 'No tienes permisos suficientes o falta validación CSRF.'
  return `Error del servidor (HTTP ${response.status}).`
}

interface AdminRequestOptions extends RequestInit {
  isLogin?: boolean
  skipCsrfFetch?: boolean
}

export async function adminFetch<T>(path: string, options: AdminRequestOptions = {}): Promise<T> {
  const { isLogin, skipCsrfFetch, headers, ...rest } = options
  const method = (rest.method || 'GET').toUpperCase()
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

  if (isMutation && !isLogin && !memoryCsrfToken && !skipCsrfFetch) {
    try {
      const csrfData = await fetchCsrfToken()
      setCsrfToken(csrfData.csrf_token)
    } catch {
      // Continuar para que el backend devuelva el código HTTP correspondiente
    }
  }

  const reqHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(headers as Record<string, string>),
  }

  if (rest.body && !(rest.body instanceof FormData) && !reqHeaders['Content-Type']) {
    reqHeaders['Content-Type'] = 'application/json'
  }

  if (isLogin) {
    reqHeaders['X-CSRF-Protection'] = '1'
  } else if (isMutation && memoryCsrfToken) {
    reqHeaders['X-CSRF-Token'] = memoryCsrfToken
  }

  const response = await fetch(buildUrl(path), {
    ...rest,
    method,
    credentials: 'include',
    headers: reqHeaders,
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  if (isMutation && path.startsWith('/api/admin/')) {
    notifyMenuUpdated()
  }

  if (response.status === 204) {
    return null as unknown as T
  }

  const text = await response.text()
  return (text ? JSON.parse(text) : null) as T
}

// Autenticación y Sesión
export async function loginAdmin(email: string, password: string): Promise<LoginResponse> {
  const data = await adminFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    isLogin: true,
    body: JSON.stringify({ email, password }),
  })
  setCsrfToken(data.csrf_token)
  return data
}

export async function fetchCurrentSession(): Promise<SessionResponse> {
  return adminFetch<SessionResponse>('/api/auth/me')
}

export async function fetchCsrfToken(): Promise<{ csrf_token: string }> {
  const res = await adminFetch<{ csrf_token: string }>('/api/auth/csrf', { skipCsrfFetch: true })
  setCsrfToken(res.csrf_token)
  return res
}

export async function logoutAdmin(): Promise<void> {
  try {
    await adminFetch<unknown>('/api/auth/logout', { method: 'POST' })
  } finally {
    setCsrfToken(null)
  }
}

// HU-007: Disponibilidad de Productos y Variantes
export async function getProductAvailability(productId: number): Promise<ProductAvailabilityResponse> {
  return adminFetch<ProductAvailabilityResponse>(`/api/admin/products/${productId}/availability`)
}

export async function updateProductAvailability(
  productId: number,
  isAvailable: boolean
): Promise<ProductAvailabilityResponse> {
  return adminFetch<ProductAvailabilityResponse>(`/api/admin/products/${productId}/availability`, {
    method: 'PATCH',
    body: JSON.stringify({ is_available: isAvailable }),
  })
}

export async function getVariantAvailability(variantId: number): Promise<VariantAvailabilityResponse> {
  return adminFetch<VariantAvailabilityResponse>(`/api/admin/variants/${variantId}/availability`)
}

export async function updateVariantAvailability(
  variantId: number,
  isAvailable: boolean
): Promise<VariantAvailabilityResponse> {
  return adminFetch<VariantAvailabilityResponse>(`/api/admin/variants/${variantId}/availability`, {
    method: 'PATCH',
    body: JSON.stringify({ is_available: isAvailable }),
  })
}

// HU-005: Descripciones
export async function getProductDescription(productId: number): Promise<DescriptionResponse> {
  return adminFetch<DescriptionResponse>(`/api/admin/products/${productId}/description`)
}

export async function updateProductDescription(
  productId: number,
  description: string | null
): Promise<DescriptionResponse> {
  return adminFetch<DescriptionResponse>(`/api/admin/products/${productId}/description`, {
    method: 'PATCH',
    body: JSON.stringify({ description }),
  })
}

// HU-005: Fotografías por variante
export async function getVariantImages(variantId: number): Promise<ImageResponse[]> {
  const res = await adminFetch<ImageListResponse | ImageResponse[]>(`/api/admin/variants/${variantId}/images`)
  return Array.isArray(res) ? res : res.images
}

export async function uploadVariantImage(
  variantId: number,
  file: File,
  displayOrder: number
): Promise<ImageResponse> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('display_order', String(displayOrder))
  return adminFetch<ImageResponse>(`/api/admin/variants/${variantId}/images`, {
    method: 'POST',
    body: formData,
  })
}

export async function updateVariantImageOrder(
  variantId: number,
  imageId: number,
  displayOrder: number
): Promise<ImageResponse> {
  return adminFetch<ImageResponse>(`/api/admin/variants/${variantId}/images/${imageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ display_order: displayOrder }),
  })
}

export async function deleteVariantImage(variantId: number, imageId: number): Promise<void> {
  await adminFetch<unknown>(`/api/admin/variants/${variantId}/images/${imageId}`, {
    method: 'DELETE',
  })
}

// HU-005: Etiquetas por variante
export async function getAllTags(): Promise<TagResponse[]> {
  const res = await adminFetch<TagListResponse | TagResponse[]>('/api/admin/tags')
  return Array.isArray(res) ? res : res.tags
}

export async function createTag(name: string): Promise<TagResponse> {
  return adminFetch<TagResponse>('/api/admin/tags', {
    method: 'POST',
    body: JSON.stringify({ name: name.trim() }),
  })
}

export async function getVariantTags(variantId: number): Promise<TagResponse[]> {
  const res = await adminFetch<TagListResponse | TagResponse[]>(`/api/admin/variants/${variantId}/tags`)
  return Array.isArray(res) ? res : res.tags
}

export async function assignTagToVariant(variantId: number, tagId: number): Promise<void> {
  await adminFetch<unknown>(`/api/admin/variants/${variantId}/tags/${tagId}`, {
    method: 'PUT',
  })
}

export async function removeTagFromVariant(variantId: number, tagId: number): Promise<void> {
  await adminFetch<unknown>(`/api/admin/variants/${variantId}/tags/${tagId}`, {
    method: 'DELETE',
  })
}

// HU-004: Configuración pública del QR
export async function getPublicMenuConfig(): Promise<MenuPublicConfigResponse> {
  return adminFetch<MenuPublicConfigResponse>('/api/menu/config')
}