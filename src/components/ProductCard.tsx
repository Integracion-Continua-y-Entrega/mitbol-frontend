import ProductImage from './ProductImage'
import { formatRepresentativePrice, getProductTagNames, getProductImageUrls } from '../services/menu'
import type { MenuProduct } from '../services/menu'
import { loadProductImageAlternatives } from '../services/productImages'

export default function ProductCard({ product, currency, onSelect, selected = false, spotlight = false }: {
  product: MenuProduct
  currency: string
  onSelect: (button: HTMLButtonElement) => void
  selected?: boolean
  spotlight?: boolean
}) {
  const imageUrls = getProductImageUrls(product)
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
          <ProductImage urls={imageUrls} alt="" className="product-image" loading="lazy" loadAlternatives={() => loadProductImageAlternatives(product.product_id)} fallback={
            <span className="product-placeholder">
              <img src="/mitbol-logo.png" alt="" />
              <span>Sin fotografía</span>
            </span>
          } />
          {(product.is_featured || product.is_new) && (
            <span className="highlight-badges">
              {product.is_featured && <span className="highlight-badge featured">★ Destacado</span>}
              {product.is_new && <span className="highlight-badge new-item">✦ Nuevo</span>}
            </span>
          )}
        </span>
        <span className="product-body">
          <span className="product-name">{product.name}</span>
          <span className="product-meta-pills">
            <span className={`availability ${isAvailable ? 'available' : 'sold-out'}`}>
              {!product.is_active ? 'No activo' : isAvailable ? 'Disponible' : 'Agotado'}
            </span>
            {product.category && (
              <span className="category-pill">{product.category.name}</span>
            )}
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