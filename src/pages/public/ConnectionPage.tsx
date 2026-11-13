import { useEffect, useRef, useState } from 'react'
import ProductCard from '../../components/ProductCard'
import { API_URL } from '../../services/config'
import { formatPrice, formatRepresentativePrice, getRepresentativeImage, getVariantTagNames, normalizeVariantModifiers, parseHealth, parseMenu, parseProduct } from '../../services/menu'
import type { MenuProduct, MenuResponse, ProductResponse } from '../../services/menu'
import { useApi } from '../../services/useApi'
import { useMenuSync } from '../../services/useMenuSync'
import './connection.css'

function Icon({ name }: { name: 'menu' | 'connection' | 'back' | 'leaf' | 'refresh' }) {
  const paths = {
    menu: 'M5 3v7m3-7v7m3-7v7M5 7h6m-3 3v11M19 3c-3 3-4 7-4 10h4m0-10v18',
    connection: 'M8 3v5m8-5v5M6 8h12v3a6 6 0 0 1-12 0V8Zm6 9v4',
    back: 'm14 5-7 7 7 7M7 12h14',
    leaf: 'M12 21c-8-2-10-8-9-13 5 0 8 2 9 6m0 7c8-2 10-8 9-13-5 0-8 2-9 6m0 7V3m0 0c-3 3-4 7 0 11 4-4 3-8 0-11Z',
    refresh: 'M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3',
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}

function MitbolLogo() {
  return <span className="brand-logo"><img src="/mitbol-logo.png" alt="" width="48" height="48" /><span className="brand-text"><span className="brand-title">mitbol</span><span className="brand-subtitle">COCINA SALUDABLE</span></span></span>
}

function Loading() {
  return <div className="notice loading-notice" role="status"><span className="loading-dot" aria-hidden="true" /><p>Consultando el menú… El primer inicio de Render puede tardar hasta 90 segundos.</p></div>
}

function Failure({ message, retry }: { message: string; retry: () => void }) {
  return <div className="notice error" role="alert"><p>{message}</p><button className="btn-primary" onClick={retry}>Reintentar</button></div>
}

function BackendStatus() {
  const { result, retry } = useApi('/', parseHealth)
  return (
    <section className="backend panel" aria-labelledby="backend-heading" aria-live="polite">
      <p className="eyebrow">Estado del servicio</p>
      <div className="section-heading"><h1 id="backend-heading" tabIndex={-1}>Conexión con cocina</h1><span className="endpoint">GET /</span></div>
      <p className="muted">Comprueba la comunicación con la API de MITBOL.</p>
      <div className="backend-actions">{result.status === 'success' && <span className="status-ok">● En línea · HTTP 2xx</span>}<button className="btn-outlined" onClick={retry}><Icon name="refresh" />Volver a comprobar</button></div>
      {result.status === 'loading' && <Loading />}
      {result.status === 'error' && <Failure message={result.message} retry={retry} />}
      {result.status === 'success' && (result.data === null ? <p className="muted">El backend respondió sin contenido.</p> : <details className="json-details"><summary>Ver diagnóstico técnico del servidor</summary><pre>{JSON.stringify(result.data, null, 2)}</pre></details>)}
      <p className="api-origin">API consultada: {API_URL}</p>
    </section>
  )
}

function ProductDetailContent({ product, currency }: { product: MenuProduct; currency: string }) {
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(product.variants[0]?.product_variant_id ?? null)
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const selectedVariant = product.variants.find(v => v.product_variant_id === selectedVariantId) ?? product.variants[0] ?? null
  const imageUrl = getRepresentativeImage(product, selectedVariant)
  const modifierGroups = normalizeVariantModifiers(selectedVariant?.modifiers)
  const variantTags = getVariantTagNames(selectedVariant)
  const isProductAvailable = product.is_active && product.is_available

  return (
    <div className="product-detail-card">
      <div className="detail-media">{imageUrl && failedImage !== imageUrl ? <img src={imageUrl} alt={selectedVariant ? `${product.name} · ${selectedVariant.name}` : product.name} className="detail-image" onError={() => setFailedImage(imageUrl)} /> : <div className="product-placeholder detail-placeholder"><img src="/mitbol-logo.png" alt="" /><span>Sin fotografía disponible</span></div>}</div>
      <div className="detail-sheet">
        <div className="detail-title-row">
          <div><p className="eyebrow">De nuestra cocina</p><h2>{product.name}</h2></div>
          <p className="price detail-price">{selectedVariant ? formatPrice(selectedVariant.price, currency) : formatRepresentativePrice(product, currency)}</p>
        </div>
        <span className={`availability ${isProductAvailable ? 'available' : 'sold-out'}`}>{!product.is_active ? 'Producto inactivo' : product.is_available ? 'Disponible' : 'Agotado'}</span>
        {variantTags.length > 0 && <div className="public-tags-row" aria-label="Etiquetas de la presentación">{variantTags.map(tag => <span className="public-tag-pill" key={tag}>{tag}</span>)}</div>}
        <p className="detail-description">{product.description?.trim() || 'Descripción no disponible.'}</p>
        {!isProductAvailable && <p className="notice sold-out-banner" role="status">Este producto no está disponible actualmente. Puedes consultar sus presentaciones y complementos.</p>}
        <section className="detail-section" aria-labelledby="variants-heading">
          <h3 id="variants-heading">Presentaciones <span className="count-badge">{product.variants.length}</span></h3>
          {product.variants.length > 0 ? <div className="variant-selector" role="group" aria-label="Seleccionar presentación">{product.variants.map(variant => {
            const isSelected = selectedVariant?.product_variant_id === variant.product_variant_id
            const available = isProductAvailable && variant.is_available
            return <button key={variant.product_variant_id} type="button" className={`variant-option ${isSelected ? 'selected' : ''}`} aria-pressed={isSelected} onClick={() => setSelectedVariantId(variant.product_variant_id)}><span className="variant-option-name">{variant.name}</span><span className="variant-option-price">{formatPrice(variant.price, currency)}</span><span className="variant-mini-tags">{getVariantTagNames(variant).map(tag => <span className="variant-mini-tag" key={tag}>{tag}</span>)}</span><small className={available ? 'variant-option-status' : 'variant-option-status unavailable'}>{available ? 'Disponible' : 'Agotado'}</small></button>
          })}</div> : <p className="muted">Este producto no tiene variantes registradas.</p>}
        </section>
        <section className="detail-section" aria-labelledby="modifiers-heading">
          <div className="options-heading"><h3 id="modifiers-heading">Opciones adicionales</h3><span>Consulta a tu mesero</span></div>
          {selectedVariant && <p className="muted variant-context">Complementos de {selectedVariant.name}</p>}
          {modifierGroups.length > 0 ? <div className="modifiers-list">{modifierGroups.map(group => <div key={group.id} className="modifier-group"><div className="modifier-group-header"><h4>{group.name}</h4>{!group.isAvailable && <span className="availability sold-out">No disponible</span>}</div>{group.complements.length > 0 ? <ul className="complements">{group.complements.map(comp => <li key={comp.id}><span><strong>{comp.name}</strong><small className={!group.isAvailable || !comp.isAvailable ? 'unavailable' : ''}>{group.isAvailable && comp.isAvailable ? 'Disponible' : 'No disponible'}</small></span><span className="complement-price">{comp.price === null ? 'Precio no informado' : Number(comp.price) > 0 ? `+ ${formatPrice(comp.price, currency)}` : 'Sin costo extra'}</span></li>)}</ul> : <p className="muted">Sin opciones registradas en este grupo.</p>}</div>)}</div> : <p className="muted">Esta presentación no cuenta con complementos o modificadores adicionales.</p>}
        </section>
        <p className="detail-service-note">Para ordenar o consultar alérgenos, comunícate con nuestro personal de sala.</p>
      </div>
    </div>
  )
}

function ProductDetail({ id, close }: { id: number; close: () => void }) {
  const { result, retry } = useApi(`/api/menu/${encodeURIComponent(id)}`, parseProduct)
  const [cachedDetail, setCachedDetail] = useState<ProductResponse | null>(null)
  if (result.status === 'success' && result.data !== cachedDetail) setCachedDetail(result.data)
  const displayData = result.status === 'success' ? result.data : cachedDetail
  useMenuSync(retry, result.status !== 'loading')
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])
  return (
    <section id="product-detail" className="detail" aria-labelledby="detail-heading" aria-live="polite">
      <h1 id="detail-heading" ref={headingRef} tabIndex={-1} className="sr-only">Detalle del producto</h1>
      {result.status === 'loading' && !displayData && <Loading />}
      {result.status === 'error' && <Failure message={result.message} retry={retry} />}
      {(result.status === 'success' || displayData) && (displayData?.product ? <ProductDetailContent key={displayData.product.product_id} product={displayData.product} currency={displayData.currency} /> : <div className="notice"><p>No se encontró información de este producto.</p><button className="btn-primary" onClick={retry}>Reintentar</button></div>)}
      <div className="detail-footer-actions"><button className="btn-outlined" onClick={close}><Icon name="back" />Volver al menú</button><button className="btn-outlined" onClick={retry}><Icon name="refresh" />Actualizar detalle</button></div>
      {displayData?.product && <details className="json-details detail-diagnostic"><summary>Ver respuesta JSON del detalle</summary><pre>{JSON.stringify(displayData, null, 2)}</pre></details>}
    </section>
  )
}

export default function ConnectionPage() {
  const { result, retry } = useApi('/api/menu', parseMenu)
  const [cachedMenu, setCachedMenu] = useState<MenuResponse | null>(null)
  if (result.status === 'success' && result.data !== cachedMenu) setCachedMenu(result.data)
  const activeMenu = result.status === 'success' ? result.data : cachedMenu
  useMenuSync(retry, result.status !== 'loading')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [view, setView] = useState<'menu' | 'connection'>('menu')
  const selectedButtonRef = useRef<HTMLButtonElement | null>(null)
  const closeDetail = () => {
    setSelectedId(null)
    requestAnimationFrame(() => selectedButtonRef.current?.focus())
  }
  const selectProduct = (id: number, button: HTMLButtonElement) => {
    selectedButtonRef.current = button
    setSelectedId(id)
  }
  const changeView = (next: 'menu' | 'connection') => {
    setView(next)
    setSelectedId(null)
    requestAnimationFrame(() => {
      document.getElementById(next === 'menu' ? 'catalog-heading' : 'backend-heading')?.focus({ preventScroll: true })
      window.scrollTo({ top: 0, behavior: 'instant' })
    })
  }
  const navigation = <>{(['menu', 'connection'] as const).map(item => <button key={item} type="button" className={`nav-item ${view === item ? 'active' : ''}`} aria-current={view === item ? 'page' : undefined} onClick={() => changeView(item)}><Icon name={item} /><span>{item === 'menu' ? 'Menú' : 'Conexión'}</span></button>)}</>

  return (
    <div className={`connection-page ${selectedId !== null ? 'detail-open' : ''}`}>
      <a className="skip-link" href={view === 'connection' ? '#backend-heading' : selectedId !== null ? '#detail-heading' : '#catalog-heading'}>Ir al contenido</a>
      <header className="site-header"><div className="header-inner">{selectedId !== null && <button className="back-button" aria-label="Cerrar detalle y volver al menú" onClick={closeDetail}><Icon name="back" /></button>}<a className="brand" href="/" aria-label="mitbol · Cocina Saludable"><MitbolLogo /></a><nav className="desktop-nav" aria-label="Navegación principal">{navigation}</nav><span className="header-caption">Carta digital</span></div></header>
      <main className={selectedId !== null ? 'main-content showing-detail' : 'main-content'}>
        <div hidden={view !== 'menu' || selectedId !== null}>
          <div className="menu-intro"><Icon name="leaf" /><span>Conoce nuestros platillos<br />y sus presentaciones.</span><span className="intro-label">CARTA<br />DIGITAL</span></div>
          <section className="catalog" aria-labelledby="catalog-heading" aria-live="polite">
            <div className="section-heading showcase-heading"><h1 id="catalog-heading" tabIndex={-1}>Nuestra carta <span aria-hidden="true" className="orange-star">✦</span></h1><a href="#menu-list">Ver todos <span aria-hidden="true">›</span></a></div>
            {result.status === 'loading' && !activeMenu && <Loading />}
            {result.status === 'error' && <Failure message={result.message} retry={retry} />}
            {(result.status === 'success' || activeMenu) && (activeMenu && activeMenu.products.length > 0 ? <>
              <div className="spotlight-track" role="group" aria-label="Explorar productos">{activeMenu.products.map(product => <ProductCard key={product.product_id} product={product} currency={activeMenu.currency} spotlight onSelect={button => selectProduct(product.product_id, button)} />)}</div>
              <div className="catalog-toolbar"><a className="catalog-chip" href="#menu-list">Todos los productos</a><button className="refresh-button" onClick={retry} aria-label="Actualizar catálogo"><Icon name="refresh" />Actualizar</button></div>
              <div id="menu-list" className="section-heading menu-list-heading"><h2>Nuestro menú</h2><span className="count-badge">{activeMenu.products.length} {activeMenu.products.length === 1 ? 'opción' : 'opciones'}</span></div>
              <div className="product-grid">{activeMenu.products.map(product => <ProductCard key={product.product_id} product={product} currency={activeMenu.currency} onSelect={button => selectProduct(product.product_id, button)} />)}</div>
              <p className="catalog-meta">Precios en {activeMenu.currency} · Consulta cada presentación en el detalle.</p>
            </> : <div className="notice"><p>Aún no existen productos publicados en el menú.</p><button className="btn-primary" onClick={retry}>Reintentar</button></div>)}
          </section>
          <aside className="menu-note"><Icon name="leaf" /><p>Si tienes alguna intolerancia o alergia alimentaria, consulta con el personal de sala.</p></aside>
        </div>
        {view === 'menu' && selectedId !== null && <ProductDetail key={selectedId} id={selectedId} close={closeDetail} />}
        <div hidden={view !== 'connection'}><BackendStatus /></div>
      </main>
      <footer className="site-footer"><strong>mitbol · Cocina Saludable</strong><span>Menú digital · Consulta a nuestro personal para ordenar.</span></footer>
      <nav className="mobile-nav" aria-label="Navegación móvil">{navigation}</nav>
    </div>
  )
}
