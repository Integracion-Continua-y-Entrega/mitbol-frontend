import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ApiError, createApiClient, normalizeApiUrl } from '../src/services/api.ts'
import { getProductTagNames, getRepresentativeImage, getVariantTagNames, normalizeVariantModifiers, parseMenu, parseProduct } from '../src/services/menu.ts'

// Fixtures exclusivamente de prueba; nunca se importan desde la aplicación.
const fixture = {
  product_id: 7, name: 'Producto de prueba', description: null, image_url: null,
  is_active: true, is_available: false, can_order: false,
  price_min: '12.50', price_max: '12.50', has_price_range: false,
  variants: [{ product_variant_id: 8, name: 'Variante de prueba', price: '12.50', is_available: false, can_order: false, image_url: null, tags: [] }],
}

test('conserva etiquetas administradas y elimina nombres vacíos o duplicados', () => {
  const item = { ...fixture, variants: [{ ...fixture.variants[0], tags: [' Vegano ', { name: 'Vegano' }, { name: 'Sin gluten' }, '', null] }] }
  assert.deepEqual(getVariantTagNames(item.variants[0]), ['Vegano', 'Sin gluten'])
  assert.deepEqual(getProductTagNames(item), ['Vegano', 'Sin gluten'])
})

test('resuelve fotografías relativas del administrador y conserva URLs completas', () => {
  assert.equal(getRepresentativeImage({ ...fixture, image_url: '/uploads/menu.webp' }), 'https://mitbol-backend.onrender.com/uploads/menu.webp')
  assert.equal(getRepresentativeImage({ ...fixture, image_url: 'https://images.example.test/menu.webp' }), 'https://images.example.test/menu.webp')
  assert.equal(getRepresentativeImage(fixture), null)
})

test('un complemento bloqueado por backend no se muestra como disponible', () => {
  const groups = normalizeVariantModifiers([{ name: 'Extras', complements: [{ name: 'Queso', price: '5.00', can_order: false, is_available: true }] }])
  assert.equal(groups[0].complements[0].isAvailable, false)
  assert.equal(groups[0].complements[0].price, '5.00')
})

test('construye URLs sin barras duplicadas y consulta sin credenciales', async () => {
  const fetcher: typeof fetch = async (input, init) => {
    assert.equal(input, 'https://example.test/api/menu')
    assert.equal(init?.credentials, 'omit')
    assert.deepEqual(init?.headers, { Accept: 'application/json' })
    return Response.json({ currency: 'MXN', products: [fixture] })
  }
  const result = parseMenu(await createApiClient(' https://example.test/// ', fetcher)('///api/menu'))
  assert.equal(result?.products[0].variants[0].price, '12.50')
  assert.equal(result?.products[0].is_available, false)
  assert.equal(result?.products[0].description, null)
})

test('acepta catálogo vacío, cuerpo vacío y detalle ausente', async () => {
  assert.deepEqual(parseMenu({ currency: 'MXN', products: [] }), { currency: 'MXN', products: [] })
  assert.equal(parseMenu(null), null)
  assert.equal(parseProduct(null), null)
  assert.deepEqual(parseProduct({ currency: 'MXN', product: null }), { currency: 'MXN', product: null })
  const request = createApiClient('https://example.test', async () => new Response(null, { status: 204 }))
  assert.equal(await request('/api/menu'), null)
})

test('conserva la respuesta real de detalle y sus campos adicionales', () => {
  const detail = { currency: 'MXN', product: { ...fixture, variants: [{ ...fixture.variants[0], images: [], modifiers: [] }] } }
  assert.equal(parseProduct(detail), detail)
})

test('rechaza contratos inesperados sin convertirlos en catálogo vacío', () => {
  for (const value of [[], {}, { currency: 'MXN', products: [{}] }, { currency: 'MXN', products: [{ ...fixture, variants: [null] }] }]) {
    assert.throws(() => parseMenu(value), ApiError)
  }
  assert.throws(() => parseProduct({ currency: 'MXN', product: [] }), ApiError)
})

test('reporta errores HTTP 404 y 500 aunque el cuerpo no sea JSON', async () => {
  for (const status of [404, 500]) {
    const request = createApiClient('https://example.test', async () => new Response('<html>Error</html>', { status }))
    await assert.rejects(request('/api/menu/7'), (error: unknown) => error instanceof ApiError && error.status === status && error.message.includes(`HTTP ${status}`))
  }
})

test('reporta respuestas exitosas con JSON inválido', async () => {
  const request = createApiClient('https://example.test', async () => new Response('<html>Not JSON</html>'))
  await assert.rejects(request('/'), /formato distinto de JSON/)
})

test('explica fallos de red y posible CORS sin fingir distinguirlos', async () => {
  const request = createApiClient('https://example.test', async () => { throw new TypeError('Failed to fetch') })
  await assert.rejects(request('/api/menu'), /conexión.*CORS/)
})

test('distingue timeout de cancelación al cambiar de producto', async () => {
  const fetcher: typeof fetch = async (_input, init) => new Promise((_resolve, reject) => {
    const signal = init!.signal!
    if (signal.aborted) reject(signal.reason)
    else signal.addEventListener('abort', () => reject(signal.reason), { once: true })
  })
  // Mantiene el proceso activo mientras AbortSignal.timeout usa un timer sin ref.
  const keepAlive = setTimeout(() => {}, 1000)
  try {
    await assert.rejects(createApiClient('https://example.test', fetcher, 5)('/'), /tardó demasiado/)
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(createApiClient('https://example.test', fetcher)('/', controller.signal), (error: unknown) => error instanceof Error && error.name === 'AbortError')
  } finally {
    clearTimeout(keepAlive)
  }
})

test('rechaza protocolos, credenciales y parámetros en la URL base', () => {
  for (const value of ['file:///tmp', 'https://user:password@example.test', 'https://example.test?api=1', 'https://example.test#menu', 'invalid']) {
    assert.throws(() => normalizeApiUrl(value))
  }
  assert.equal(normalizeApiUrl('http://localhost:8000/'), 'http://localhost:8000')
})
