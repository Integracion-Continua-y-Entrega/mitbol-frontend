import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ApiError, createApiClient, normalizeApiUrl } from '../src/services/api.ts'
import { getProductImageUrls, getProductTagNames, getRepresentativeImage, getVariantTagNames, normalizeVariantModifiers, parseMenu, parseProduct, resolveProductConfiguration, sumMenuPrices } from '../src/services/menu.ts'

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

test('incluye toda la galería sin repetir la foto principal para intentar alternativas', () => {
  const item = {
    ...fixture,
    image_url: '/media/principal.jpg',
    variants: [{
      ...fixture.variants[0], image_url: '/media/principal.jpg',
      images: [{ image_url: '/media/principal.jpg' }, { image_url: '/media/respaldo.jpg' }, '/media/otra.jpg', null, { image_url: '' }],
    }],
  }
  assert.deepEqual(getProductImageUrls(item), [
    'https://mitbol-backend.onrender.com/media/principal.jpg',
    'https://mitbol-backend.onrender.com/media/respaldo.jpg',
    'https://mitbol-backend.onrender.com/media/otra.jpg',
  ])
})

test('el catálogo considera galerías de otras variantes; el detalle conserva la variante elegida', () => {
  const first = { ...fixture.variants[0], image_url: '/media/sencilla.jpg', images: [] }
  const second = { ...fixture.variants[0], product_variant_id: 9, image_url: '/media/doble.jpg', images: [{ image_url: '/media/doble-alternativa.jpg' }] }
  const item = { ...fixture, image_url: first.image_url, variants: [first, second] }
  assert.equal(getProductImageUrls(item).length, 3)
  assert.deepEqual(getProductImageUrls(item, first), ['https://mitbol-backend.onrender.com/media/sencilla.jpg'])
  assert.deepEqual(getProductImageUrls(item, second), [
    'https://mitbol-backend.onrender.com/media/doble.jpg',
    'https://mitbol-backend.onrender.com/media/doble-alternativa.jpg',
  ])
})

test('un complemento bloqueado por backend no se muestra como disponible', () => {
  const groups = normalizeVariantModifiers([{ name: 'Extras', complements: [{ name: 'Queso', price: '5.00', can_order: false, is_available: true }] }])
  assert.equal(groups[0].complements[0].isAvailable, false)
  assert.equal(groups[0].complements[0].price, '5.00')
})

test('respeta grupos bloqueados y no comparte identificadores generados entre variantes', () => {
  const modifiers = [{ name: 'Extras', can_order: false, complements: [{ name: 'Queso', price: '5.00' }] }]
  const [first] = normalizeVariantModifiers(modifiers, 4)
  const [second] = normalizeVariantModifiers(modifiers, 5)
  assert.equal(first.isAvailable, false)
  assert.notEqual(first.id, second.id)
  assert.notEqual(first.complements[0].id, second.complements[0].id)
})

test('suma precios de variante y extras con precisión decimal y detecta precios ausentes', () => {
  assert.equal(sumMenuPrices(['129.00', '15.00', '20.00', '0.00']), '164.00')
  assert.equal(sumMenuPrices(['0.1', '0.20', '0.005']), '0.305')
  assert.equal(sumMenuPrices(['89.00', null]), null)
  assert.equal(sumMenuPrices(['89.00', '']), null)
})

test('valida la configuración contra los extras vigentes de la presentación', () => {
  const cheese = { product_complement_id: 3, name: 'Queso', price: '5.25' }
  const bacon = { product_complement_id: 4, name: 'Tocino', price: '7.00' }
  const group = { product_modifier_id: 2, name: 'Extras' }
  const first = {
    ...fixture.variants[0], is_available: true, can_order: true,
    modifiers: [{ ...group, complements: [cheese, bacon] }],
  }
  const second = { ...first, product_variant_id: 9, price: '20.00', modifiers: [{ ...group, complements: [cheese] }] }
  const item = { ...fixture, is_available: true, can_order: true, variants: [first, second] }
  const { groups } = resolveProductConfiguration(item, first.product_variant_id, [])
  const keys = groups[0].complements.map(option => option.key)
  assert.deepEqual(resolveProductConfiguration(item, first.product_variant_id, keys).configuration, {
    productId: 7, variantId: 8, complementIds: [3, 4], estimatedPrice: '24.75',
  })
  const switched = resolveProductConfiguration(item, second.product_variant_id, keys)
  assert.equal(switched.configuration, null)
  assert.deepEqual(switched.selectedKeys, keys.slice(0, 1))
  assert.equal(resolveProductConfiguration(item, second.product_variant_id, switched.selectedKeys).configuration?.estimatedPrice, '25.25')
  assert.equal(resolveProductConfiguration(item, 999, []).configuration, null)
})

test('descarta configuraciones agotadas y bloquea complementos sin precio o identificador', () => {
  const variant = {
    ...fixture.variants[0], is_available: true, can_order: true,
    modifiers: [{ product_modifier_id: 2, name: 'Extras', complements: [
      { name: 'Sin identificador', price: '3.00' },
      { product_complement_id: 3, name: 'Sin precio' },
      { product_complement_id: 4, name: 'Salsa', price: '0.00' },
    ] }],
  }
  const item = { ...fixture, is_available: true, can_order: true, variants: [variant] }
  const options = resolveProductConfiguration(item, variant.product_variant_id, []).groups[0].complements
  assert.deepEqual(options.map(option => option.isAvailable), [false, false, true])
  assert.equal(resolveProductConfiguration(item, variant.product_variant_id, [options[2].key]).configuration?.estimatedPrice, '12.50')
  const soldOut = { ...item, variants: [{ ...variant, can_order: false }] }
  const stale = resolveProductConfiguration(soldOut, variant.product_variant_id, [options[2].key])
  assert.equal(stale.configuration, null)
  assert.deepEqual(stale.selectedKeys, [])
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
