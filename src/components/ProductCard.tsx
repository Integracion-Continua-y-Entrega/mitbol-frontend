import { formatPrice } from '../services/menu'
import type { MenuProduct } from '../services/menu'

export default function ProductCard({ product, currency, onSelect }: {
  product: MenuProduct
  currency: string
  onSelect?: () => void
}) {
  return (
    <article className="product-card">
      <div className="product-top">
        <span className="product-mark" aria-hidden="true">M</span>
        <span className={`availability ${product.is_available ? 'available' : ''}`}>
          {product.is_available ? 'Disponible' : 'No disponible'}
        </span>
      </div>
      <h3>{product.name}</h3>
      <p className="description">{product.description?.trim() || 'Descripción no disponible.'}</p>
      <p className="price">
        {formatPrice(product.price_min, currency)}
        {product.has_price_range && product.price_max !== null && <> – {formatPrice(product.price_max, currency)}</>}
      </p>
      {product.variants.length > 0 ? (
        <ul className="variants">
          {product.variants.map((variant) => (
            <li key={variant.product_variant_id}>
              <span>{variant.name}<small>{variant.is_available ? 'Disponible' : 'No disponible'}</small></span>
              <span>{formatPrice(variant.price, currency)}</span>
            </li>
          ))}
        </ul>
      ) : <p className="muted">Sin variantes registradas.</p>}
      {onSelect && <button className="detail-button" onClick={onSelect}>Consultar detalle <span aria-hidden="true">↗</span></button>}
    </article>
  )
}
