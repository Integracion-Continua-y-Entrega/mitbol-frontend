import { useState } from 'react'
import { formatPrice, formatRepresentativePrice, getRepresentativeImage } from '../services/menu'
import type { MenuProduct } from '../services/menu'

function citrusMark() {
  return (
    <svg className="citrus-icon" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="36" r="20" fill="#F97316" />
      <circle cx="32" cy="36" r="16" fill="#FDBA74" />
      <circle cx="32" cy="36" r="14" fill="#F97316" />
      <g stroke="#FEF3C7" strokeWidth="1.6" strokeLinecap="round">
        <line x1="32" y1="22" x2="32" y2="50" />
        <line x1="18" y1="36" x2="46" y2="36" />
        <line x1="22.1" y1="26.1" x2="41.9" y2="45.9" />
        <line x1="41.9" y1="26.1" x2="22.1" y2="45.9" />
      </g>
      <circle cx="32" cy="36" r="2.5" fill="#FEF3C7" />
      <path d="M31 15C25 13 21 7 23 3C28 4 32 9 31 15Z" fill="#627D32" />
      <path d="M33 15C39 13 43 7 41 3C36 4 32 9 33 15Z" fill="#A3E635" />
    </svg>
  )
}

export default function ProductCard({ product, currency, onSelect, selected = false }: {
  product: MenuProduct
  currency: string
  onSelect?: (button: HTMLButtonElement) => void
  selected?: boolean
}) {
  const [imgError, setImgError] = useState(false)
  const imageUrl = getRepresentativeImage(product)
  const isAvailable = product.is_available && product.is_active

  return (
    <article className={`product-card ${!isAvailable ? 'product-card-unavailable' : ''}`}>
      <div className="product-media">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="product-image"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="product-placeholder" aria-label="Sin fotografía disponible">
            {citrusMark()}
            <span className="placeholder-brand">mitbol</span>
            <span className="placeholder-text">Cocina saludable · Sin foto</span>
          </div>
        )}
        <div className="product-badges">
          <span className={`availability ${isAvailable ? 'available' : 'sold-out'}`}>
            {!product.is_active ? 'No activo' : product.is_available ? 'Disponible' : 'Agotado'}
          </span>
          {product.variants.length > 1 && (
            <span className="variant-count">{product.variants.length} opciones</span>
          )}
        </div>
      </div>

      <div className="product-body">
        <div className="product-header-row">
          <h3>{product.name}</h3>
          <p className="price">{formatRepresentativePrice(product, currency)}</p>
        </div>

        <p className="description">
          {product.description?.trim() || 'Platillo preparado al momento con ingredientes frescos.'}
        </p>

        {product.variants.length > 0 ? (
          <ul className="variants" aria-label={`Presentaciones de ${product.name}`}>
            {product.variants.map((variant) => {
              const variantAvailable = isAvailable && variant.is_available
              return (
                <li key={variant.product_variant_id}>
                  <span className="variant-row-name">
                    {variant.name}
                    <small className={variantAvailable ? 'status-dot-ok' : 'status-dot-out'}>
                      {variantAvailable ? 'Disponible' : 'Agotado'}
                    </small>
                  </span>
                  <span className="variant-row-price">{formatPrice(variant.price, currency)}</span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="muted">Sin variantes registradas.</p>
        )}

        {onSelect && (
          <button
            className="btn-primary detail-button"
            aria-controls={selected ? 'product-detail' : undefined}
            aria-expanded={selected}
            aria-label={`Consultar detalle de ${product.name}`}
            onClick={(event) => onSelect(event.currentTarget)}
          >
            Consultar detalle <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </article>
  )
}
