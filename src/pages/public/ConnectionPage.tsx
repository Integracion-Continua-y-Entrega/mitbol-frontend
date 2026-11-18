import { useEffect, useRef, useState } from 'react'
import ProductCard from '../../components/ProductCard'
import ProductImage from '../../components/ProductImage'
import { formatPrice, formatRepresentativePrice, getProductImageUrls, getVariantTagNames, normalizeVariantModifiers, parseMenu, parseProduct, sumMenuPrices } from '../../services/menu'
import type { MenuProduct, MenuResponse, ProductResponse } from '../../services/menu'
import { useApi } from '../../services/useApi'
import { useMenuSync } from '../../services/useMenuSync'
import './connection.css'

type PublicView = 'menu' | 'loyalty'

function Icon({ name }: { name: PublicView | 'back' | 'leaf' }) {
  const paths = {
    menu: 'M5 3v7m3-7v7m3-7v7M5 7h6m-3 3v11M19 3c-3 3-4 7-4 10h4m0-10v18',
    loyalty: 'M12 20.5 4.5 13a4.8 4.8 0 0 1 6.8-6.8l.7.7.7-.7a4.8 4.8 0 0 1 6.8 6.8L12 20.5Z',
    back: 'm14 5-7 7 7 7M7 12h14',
    leaf: 'M12 21c-8-2-10-8-9-13 5 0 8 2 9 6m0 7c8-2 10-8 9-13-5 0-8 2-9 6m0 7V3m0 0c-3 3-4 7 0 11 4-4 3-8 0-11Z',
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

function ProductDetailContent({ product, currency }: { product: MenuProduct; currency: string }) {
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(product.variants[0]?.product_variant_id ?? null)
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const selectedVariant = product.variants.find(v => v.product_variant_id === selectedVariantId) ?? product.variants[0] ?? null
  const imageUrls = getProductImageUrls(product, selectedVariant)
  const variantTags = getVariantTagNames(selectedVariant)
  const isProductAvailable = product.is_active && product.is_available
  const canCustomize = isProductAvailable && product.can_order && selectedVariant?.is_available === true && selectedVariant.can_order
  const modifierGroups = normalizeVariantModifiers(selectedVariant?.modifiers, selectedVariant?.product_variant_id).map(group => ({
    ...group,
    complements: group.complements.map(option => ({
      ...option,
      key: JSON.stringify([group.id, option.id]),
      isAvailable: canCustomize && group.isAvailable && option.isAvailable,
    })),
  }))
  const selectedComplements = modifierGroups.flatMap(group => group.complements)
    .filter(option => option.isAvailable && selectedOptions.includes(option.key))
  if (selectedComplements.length !== selectedOptions.length) {
    setSelectedOptions(selectedComplements.map(option => option.key))
  }
  const price = selectedVariant && selectedComplements.length > 0
    ? sumMenuPrices([selectedVariant.price, ...selectedComplements.map(option => option.price)])
    : selectedVariant?.price ?? null

  return (
    <div className="product-detail-card">
      <div className="detail-media">
        <ProductImage
          key={selectedVariant?.product_variant_id ?? product.product_id}
          urls={imageUrls}
          alt={selectedVariant ? `${product.name} · ${selectedVariant.name}` : product.name}
          className="detail-image"
          fallback={<div className="product-placeholder detail-placeholder"><img src="/mitbol-logo.png" alt="" /><span>Sin fotografía disponible para esta presentación</span></div>}
        />
      </div>
      <div className="detail-sheet">
        <div className="detail-title-row">
          <div>
            <p className="eyebrow">De nuestra cocina</p>
            <h2>{product.name}</h2>
            {selectedVariant && <p className="muted selected-variant-name">{selectedVariant.name}</p>}
          </div>
          <p className="price detail-price">
            {selectedComplements.length > 0 && <span>Importe estimado</span>}
            {selectedVariant ? formatPrice(price, currency) : formatRepresentativePrice(product, currency)}
          </p>
        </div>
        <span className={`availability ${isProductAvailable ? 'available' : 'sold-out'}`}>{!product.is_active ? 'Producto inactivo' : product.is_available ? 'Disponible' : 'Agotado'}</span>
        {variantTags.length > 0 && <div className="public-tags-row" aria-label="Etiquetas de la presentación">{variantTags.map(tag => <span className="public-tag-pill" key={tag}>{tag}</span>)}</div>}
        {product.variants.length <= 1 && product.description?.trim() && <p className="detail-description">{product.description}</p>}
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
          <div className="options-heading"><h3 id="modifiers-heading">Opciones adicionales</h3></div>
          {modifierGroups.length > 0 ? (
            <div className="modifiers-list">
              {modifierGroups.map(group => (
                <div key={group.id}>
                  <div className="modifier-group-header">
                    <h4>{group.name}</h4>
                    {!group.isAvailable && <span className="availability sold-out">No disponible</span>}
                  </div>
                  {group.complements.length > 0 ? (
                    <ul className="complements">
                      {group.complements.map(option => (
                        <li key={option.key}>
                          <label className="complement-option">
                            <input
                              type="checkbox"
                              checked={option.isAvailable && selectedOptions.includes(option.key)}
                              disabled={!option.isAvailable}
                              onChange={(event) => {
                                const checked = event.currentTarget.checked
                                setSelectedOptions(current => checked
                                  ? [...current, option.key]
                                  : current.filter(key => key !== option.key))
                              }}
                            />
                            <span className="complement-name">
                              <strong>{option.name}</strong>
                              {!option.isAvailable && <small className="unavailable">No disponible</small>}
                            </span>
                            <span className="complement-price">
                              {option.price === null ? 'Precio no informado' : Number(option.price) === 0 ? 'Sin costo extra' : `+ ${formatPrice(option.price, currency)}`}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="muted">Sin opciones registradas en este grupo.</p>}
                </div>
              ))}
            </div>
          ) : <p className="muted">Esta presentación no cuenta con complementos o modificadores adicionales.</p>}
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
      <div className="detail-footer-actions"><button className="btn-outlined" onClick={close}><Icon name="back" />Volver al menú</button></div>
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
  const [view, setView] = useState<PublicView>('menu')
  const selectedButtonRef = useRef<HTMLButtonElement | null>(null)
  const closeDetail = () => {
    setSelectedId(null)
    if (result.status !== 'loading') retry()
    requestAnimationFrame(() => selectedButtonRef.current?.focus())
  }
  const selectProduct = (id: number, button: HTMLButtonElement) => {
    selectedButtonRef.current = button
    setSelectedId(id)
  }
  const changeView = (next: PublicView) => {
    if (next === 'menu' && (view !== 'menu' || selectedId !== null) && result.status !== 'loading') retry()
    setView(next)
    setSelectedId(null)
    requestAnimationFrame(() => {
      document.getElementById(next === 'menu' ? 'catalog-heading' : 'loyalty-heading')?.focus({ preventScroll: true })
      window.scrollTo({ top: 0, behavior: 'instant' })
    })
  }
  const navigation = <>{(['menu', 'loyalty'] as const).map(item => <button key={item} type="button" className={`nav-item ${view === item ? 'active' : ''}`} aria-current={view === item ? 'page' : undefined} onClick={() => changeView(item)}><Icon name={item} /><span>{item === 'menu' ? 'Menú' : 'Mi lealtad'}</span></button>)}</>

  return (
    <div className={view === 'loyalty' ? 'connection-page loyalty-open' : 'connection-page'}>
      <a className="skip-link" href={view === 'loyalty' ? '#loyalty-heading' : selectedId !== null ? '#detail-heading' : '#catalog-heading'}>Ir al contenido</a>
      <header className="site-header"><div className="header-inner">{selectedId !== null && <button className="back-button" aria-label="Cerrar detalle y volver al menú" onClick={closeDetail}><Icon name="back" /></button>}<a className="brand" href="/" aria-label="mitbol · Cocina Saludable"><MitbolLogo /></a><nav className="desktop-nav" aria-label="Navegación principal">{navigation}</nav></div></header>
      <main className={selectedId !== null ? 'main-content showing-detail' : 'main-content'}>
        <div hidden={view !== 'menu' || selectedId !== null}>
          <section className="catalog" aria-labelledby="catalog-heading" aria-live="polite">
            <div className="section-heading showcase-heading"><h1 id="catalog-heading" tabIndex={-1}>Nuestra carta <span aria-hidden="true" className="orange-star">✦</span></h1><a href="#menu-list">Ver todos <span aria-hidden="true">›</span></a></div>
            {result.status === 'loading' && !activeMenu && <Loading />}
            {result.status === 'error' && <Failure message={result.message} retry={retry} />}
            {(result.status === 'success' || activeMenu) && (activeMenu && activeMenu.products.length > 0 ? <>
              <div className="spotlight-track" role="group" aria-label="Explorar productos">{activeMenu.products.map(product => <ProductCard key={product.product_id} product={product} currency={activeMenu.currency} spotlight onSelect={button => selectProduct(product.product_id, button)} />)}</div>
              <div className="catalog-toolbar"><a className="catalog-chip" href="#menu-list">Todos los productos</a></div>
              <div id="menu-list" className="section-heading menu-list-heading"><h2>Nuestro menú</h2><span className="count-badge">{activeMenu.products.length} {activeMenu.products.length === 1 ? 'opción' : 'opciones'}</span></div>
              <div className="product-grid">{activeMenu.products.map(product => <ProductCard key={product.product_id} product={product} currency={activeMenu.currency} onSelect={button => selectProduct(product.product_id, button)} />)}</div>
              <p className="catalog-meta">Precios en {activeMenu.currency} · Consulta cada presentación en el detalle.</p>
            </> : <div className="notice"><p>Aún no existen productos publicados en el menú.</p><button className="btn-primary" onClick={retry}>Reintentar</button></div>)}
          </section>
          <aside className="menu-note"><Icon name="leaf" /><p>Si tienes alguna intolerancia o alergia alimentaria, consulta con el personal de sala.</p></aside>
        </div>
        {view === 'menu' && selectedId !== null && <ProductDetail key={selectedId} id={selectedId} close={closeDetail} />}
        {view === 'loyalty' && <section className="loyalty-view" aria-label="Mi lealtad"><h1 id="loyalty-heading" tabIndex={-1}>Próximamente…</h1></section>}
      </main>
      {view === 'menu' && <footer className="site-footer"><strong>mitbol · Cocina Saludable</strong><span>Menú digital · Consulta a nuestro personal para ordenar.</span></footer>}
      <nav className="mobile-nav" aria-label="Navegación móvil">{navigation}</nav>
    </div>
  )
}
