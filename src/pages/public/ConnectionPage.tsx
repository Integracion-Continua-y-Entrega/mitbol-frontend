import { useState } from 'react'
import ProductCard from '../../components/ProductCard'
import { API_URL } from '../../services/config'
import {
  formatPrice,
  formatRepresentativePrice,
  getRepresentativeImage,
  normalizeVariantModifiers,
  parseHealth,
  parseMenu,
  parseProduct,
} from '../../services/menu'
import type { MenuProduct } from '../../services/menu'
import { useApi } from '../../services/useApi'
import './connection.css'

function MitbolLogo() {
  return (
    <div className="brand-logo" aria-label="mitbol Cocina Saludable">
      <svg className="brand-badge-svg" viewBox="0 0 120 120" role="img" aria-hidden="true">
        <circle cx="60" cy="60" r="58" fill="#627D32" />
        <path d="M77 35C72 32 69 25 72 20C77 21 80 28 77 35Z" fill="#4D6626" />
        <path d="M80 35C85 32 88 25 85 20C80 21 77 28 80 35Z" fill="#A3E635" />
        <text x="14" y="68" fill="#FFFFFF" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="800" fontSize="29" letterSpacing="-0.5">
          mitb
        </text>
        <circle cx="42.5" cy="44" r="3.4" fill="#FBBF24" />
        <circle cx="79" cy="59" r="11.5" fill="#F97316" />
        <circle cx="79" cy="59" r="9.3" fill="#FDE68A" />
        <circle cx="79" cy="59" r="8" fill="#F59E0B" />
        <g stroke="#FEF3C7" strokeWidth="1.1">
          <line x1="79" y1="50" x2="79" y2="68" />
          <line x1="70" y1="59" x2="88" y2="59" />
          <line x1="72.5" y1="52.5" x2="85.5" y2="65.5" />
          <line x1="85.5" y1="52.5" x2="72.5" y2="65.5" />
        </g>
        <text x="93" y="68" fill="#FFFFFF" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="800" fontSize="29">
          l
        </text>
        <text x="60" y="86" textAnchor="middle" fill="#ECF3E0" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="600" fontSize="6.8" letterSpacing="2.4">
          COCINA SALUDABLE
        </text>
      </svg>
      <div className="brand-text">
        <span className="brand-title">
          mitb<span className="brand-o">o</span>l
        </span>
        <span className="brand-subtitle">COCINA SALUDABLE</span>
      </div>
    </div>
  )
}

function Loading() {
  return (
    <div className="notice loading-notice" role="status">
      <div className="brand-bars" aria-hidden="true">
        <span className="bar bar-green" />
        <span className="bar bar-orange" />
        <span className="bar bar-lime" />
      </div>
      <p>Consultando el menú saludable… El primer inicio en Render puede tardar hasta 90 segundos.</p>
    </div>
  )
}

function Failure({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="notice error" role="alert">
      <p>{message}</p>
      <button className="btn-inverted" onClick={retry}>Reintentar</button>
    </div>
  )
}

function BackendStatus() {
  const { result, retry } = useApi('/', parseHealth)
  return (
    <section className="backend panel" aria-labelledby="backend-heading" aria-live="polite">
      <div className="backend-header">
        <div className="backend-title-group">
          <span className="eyebrow">Estado del servicio</span>
          <h2 id="backend-heading">Conexión con cocina</h2>
          <code>GET /</code>
        </div>
        <div className="backend-actions">
          {result.status === 'success' && <span className="status-ok">● En línea · HTTP 2xx</span>}
          <button className="btn-outlined" onClick={retry}>Volver a comprobar</button>
        </div>
      </div>
      <div className="backend-result">
        {result.status === 'loading' && <Loading />}
        {result.status === 'error' && <Failure message={result.message} retry={retry} />}
        {result.status === 'success' && (
          result.data === null ? (
            <p className="muted">El backend respondió sin contenido.</p>
          ) : (
            <details className="json-details">
              <summary>Ver diagnóstico técnico del servidor</summary>
              <pre>{JSON.stringify(result.data, null, 2)}</pre>
            </details>
          )
        )}
      </div>
    </section>
  )
}

function ProductDetailContent({ product, currency }: { product: MenuProduct; currency: string }) {
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    product.variants.length > 0 ? product.variants[0].product_variant_id : null
  )
  const [imgError, setImgError] = useState(false)

  const selectedVariant = product.variants.find((v) => v.product_variant_id === selectedVariantId)
    ?? product.variants[0]
    ?? null

  const imageUrl = getRepresentativeImage(product, selectedVariant)
  const modifierGroups = normalizeVariantModifiers(selectedVariant?.modifiers)
  const isProductAvailable = product.is_active && product.is_available

  return (
    <div className="product-detail-card">
      <div className="detail-header-grid">
        <div className="detail-media">
          {imageUrl && !imgError ? (
            <img
              src={imageUrl}
              alt={selectedVariant ? `${product.name} - ${selectedVariant.name}` : product.name}
              className="detail-image"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="product-placeholder detail-placeholder" aria-label="Sin fotografía disponible">
              <span className="placeholder-brand">mitbol</span>
              <span className="placeholder-text">Sin fotografía disponible</span>
            </div>
          )}
        </div>

        <div className="detail-summary">
          <div className="product-top">
            <span className={`availability ${isProductAvailable ? 'available' : 'sold-out'}`}>
              {!product.is_active ? 'Producto inactivo' : product.is_available ? 'Disponible' : 'Agotado'}
            </span>
          </div>
          <h3>{product.name}</h3>
          <p className="description">{product.description?.trim() || 'Descripción no disponible.'}</p>

          <p className="price detail-price">
            {selectedVariant
              ? formatPrice(selectedVariant.price, currency)
              : formatRepresentativePrice(product, currency)}
          </p>

          {!isProductAvailable && (
            <p className="notice sold-out-banner" role="status">
              Este platillo se encuentra temporalmente agotado y no está disponible para nuevas solicitudes.
            </p>
          )}
        </div>
      </div>

      <div className="detail-section">
        <h4>Presentaciones disponibles ({product.variants.length})</h4>
        {product.variants.length > 0 ? (
          <div className="variant-selector" role="group" aria-label="Seleccionar presentación">
            {product.variants.map((variant) => {
              const isSelected = selectedVariant?.product_variant_id === variant.product_variant_id
              const variantAvailable = isProductAvailable && variant.is_available
              return (
                <button
                  key={variant.product_variant_id}
                  type="button"
                  className={`variant-option ${isSelected ? 'selected' : ''} ${!variantAvailable ? 'unavailable' : ''}`}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedVariantId(variant.product_variant_id)
                    setImgError(false)
                  }}
                >
                  <span className="variant-option-name">{variant.name}</span>
                  <span className="variant-option-price">{formatPrice(variant.price, currency)}</span>
                  <small className="variant-option-status">
                    {variantAvailable ? 'Disponible' : 'Agotado'}
                  </small>
                </button>
              )
            })}
          </div>
        ) : (
          <p className="muted">Este producto no tiene variantes registradas.</p>
        )}
      </div>

      <div className="detail-section">
        <h4>
          Complementos y modificadores
          {selectedVariant && product.variants.length > 1 ? ` · ${selectedVariant.name}` : ''}
        </h4>
        {modifierGroups.length > 0 ? (
          <div className="modifiers-list">
            {modifierGroups.map((group) => (
              <div key={group.id} className="modifier-group">
                <div className="modifier-group-header">
                  <strong>{group.name}</strong>
                  {!group.isAvailable && <span className="availability sold-out">No disponible</span>}
                </div>
                {group.complements.length > 0 ? (
                  <ul className="variants">
                    {group.complements.map((comp) => {
                      const compAvailable = group.isAvailable && comp.isAvailable
                      return (
                        <li key={comp.id}>
                          <span>
                            {comp.name}
                            <small>{compAvailable ? 'Disponible' : 'No disponible'}</small>
                          </span>
                          <span className="complement-price">
                            {comp.price && Number(comp.price) > 0
                              ? `+ ${formatPrice(comp.price, currency)}`
                              : 'Sin costo extra'}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="muted">Sin opciones registradas en este grupo.</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Esta presentación no cuenta con complementos o modificadores adicionales.</p>
        )}
      </div>
    </div>
  )
}

function ProductDetail({ id, close }: { id: number; close: () => void }) {
  const { result, retry } = useApi(`/api/menu/${encodeURIComponent(id)}`, parseProduct)
  return (
    <section id="product-detail" className="panel detail" aria-labelledby="detail-heading" aria-live="polite">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Consulta individual</p>
          <h2 id="detail-heading">Detalle del platillo #{id}</h2>
        </div>
        <button className="btn-secondary" onClick={close}>Cerrar detalle ✕</button>
      </div>
      {result.status === 'loading' && <Loading />}
      {result.status === 'error' && <Failure message={result.message} retry={retry} />}
      {result.status === 'success' && (result.data?.product ? <>
        <ProductDetailContent product={result.data.product} currency={result.data.currency} />
        <div className="detail-footer-actions">
          <details className="json-details">
            <summary>Ver respuesta JSON (`GET /api/menu/{id}`)</summary>
            <pre>{JSON.stringify(result.data, null, 2)}</pre>
          </details>
          <button className="btn-outlined" onClick={retry}>Actualizar detalle</button>
        </div>
      </> : <div className="notice"><p>El endpoint respondió sin datos del producto.</p><button className="btn-primary" onClick={retry}>Reintentar</button></div>)}
    </section>
  )
}

export default function ConnectionPage() {
  const { result, retry } = useApi('/api/menu', parseMenu)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  return (
    <div className="connection-page">
      <header className="site-header">
        <a className="brand" href="/">
          <MitbolLogo />
        </a>
        <nav className="pill-nav" aria-label="Accesos rápidos">
          <a href="#catalog-heading" className="pill-nav-item active">Menú</a>
          <a href="#backend-heading" className="pill-nav-item">Conexión</a>
        </nav>
      </header>

      <main>
        <section className="welcome-hero">
          <div className="welcome-copy">
            <span className="eyebrow">Menú Digital · Cocina Saludable</span>
            <h1>Ingredientes reales,<br />sabor que te hace bien.</h1>
            <p>
              Explora nuestros platillos saludables, conoce sus distintas presentaciones
              y personalízalos con los complementos disponibles.
            </p>
            <div className="hero-actions">
              <a href="#catalog-heading" className="btn-primary">Explorar platillos</a>
              <button type="button" className="btn-secondary" onClick={retry}>Actualizar menú</button>
            </div>
          </div>
          <div className="welcome-card" aria-hidden="true">
            <div className="brand-bars">
              <span className="bar bar-green" />
              <span className="bar bar-orange" />
              <span className="bar bar-lime" />
            </div>
            <p className="welcome-card-title">Frescura al momento</p>
            <p className="welcome-card-sub">Catálogo sincronizado directamente con nuestra cocina.</p>
          </div>
        </section>

        <section className="catalog" aria-labelledby="catalog-heading" aria-live="polite">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Desde nuestra cocina</p>
              <h2 id="catalog-heading">Nuestro Menú</h2>
            </div>
            <button className="btn-outlined" onClick={retry}>↻ Actualizar catálogo</button>
          </div>

          {result.status === 'loading' && <Loading />}
          {result.status === 'error' && <Failure message={result.message} retry={retry} />}
          {result.status === 'success' && (result.data && result.data.products.length > 0 ? <>
            <p className="catalog-meta">
              Mostrando <strong>{result.data.products.length}</strong> {result.data.products.length === 1 ? 'platillo' : 'platillos'} · Moneda: <strong>{result.data.currency}</strong>
            </p>
            <div className="product-grid">
              {result.data.products.map((product) => (
                <ProductCard
                  key={product.product_id}
                  product={product}
                  currency={result.data!.currency}
                  onSelect={() => {
                    setSelectedId(product.product_id)
                    setTimeout(() => {
                      document.getElementById('product-detail')?.scrollIntoView({ behavior: 'smooth' })
                    }, 50)
                  }}
                />
              ))}
            </div>
          </> : (
            <div className="notice">
              <p>El servidor respondió correctamente, pero aún no existen productos publicados en el menú.</p>
              <button className="btn-primary" onClick={retry}>Reintentar</button>
            </div>
          ))}
        </section>

        {selectedId !== null ? (
          <ProductDetail key={selectedId} id={selectedId} close={() => setSelectedId(null)} />
        ) : (
          <p className="detail-hint">
            Selecciona <strong>«Consultar detalle»</strong> en cualquier platillo para revisar sus presentaciones y complementos.
          </p>
        )}

        <BackendStatus />
      </main>

      <footer className="site-footer">
        <span><strong>mitbol</strong> · Cocina Saludable</span>
        <span className="api-origin">Conectado a: {API_URL}</span>
        <span>Menú Digital v2.1</span>
      </footer>
    </div>
  )
}