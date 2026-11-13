import { useState } from 'react'
import { formatRepresentativePrice, getProductTagNames, getRepresentativeImage } from '../services/menu'
import type { MenuProduct } from '../services/menu'

export default function ProductCard({ product, currency, onSelect, selected = false, spotlight = false }: {
  product: MenuProduct
  currency: string
  onSelect: (button: HTMLButtonElement) => void
  selected?: boolean
  spotlight?: boolean
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const imageUrl = getRepresentativeImage(product)
  const isAvailable = product.is_available && product.is_active
  const tags = getProductTagNames(product)

  return (
    <article className={`product-card ${spotlight ? 'spotlight-card' : ''} ${!isAvailable ? 'product-card-unavailable' : ''}`}>
      <button
        type="button"
        className="product-card-button"
        aria-controls={selected ? 'product-detail' : undefined}
        aria-expanded={selected}
        aria-label={`Consultar detalle de ${product.name}`}
        onClick={(event) => onSelect(event.currentTarget)}
      >
        <span className="product-media">
          {imageUrl && failedImage !== imageUrl ? (
            <img src={imageUrl} alt="" className="product-image" loading="lazy" onError={() => setFailedImage(imageUrl)} />
          ) : (
            <span className="product-placeholder">
              <img src="/mitbol-logo.png" alt="" />
              <span>Sin fotografía</span>
            </span>
          )}
        </span>
        <span className="product-body">
          <span className="product-name">{product.name}</span>
          <span className={`availability ${isAvailable ? 'available' : 'sold-out'}`}>
            {!product.is_active ? 'No activo' : isAvailable ? 'Disponible' : 'Agotado'}
          </span>
          {tags.length > 0 && <span className="public-tags-row" aria-label="Etiquetas del producto">{tags.map(tag => <span className="public-tag-pill" key={tag}>{tag}</span>)}</span>}
          <span className="description">{product.description?.trim() || 'Consulta sus presentaciones y complementos.'}</span>
          <span className="product-bottom-row">
            <span className="price">{formatRepresentativePrice(product, currency)}</span>
            {!spotlight && <span className="variant-count">{product.variants.length} {product.variants.length === 1 ? 'presentación' : 'presentaciones'}</span>}
          </span>
          {!spotlight && <span className="card-detail-link">Ver detalle <span aria-hidden="true">↗</span></span>}
        </span>
      </button>
    </article>
  )
}
