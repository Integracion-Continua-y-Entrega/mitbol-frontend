import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  assignTagToVariant,
  createTag,
  deleteVariantImage,
  getAllTags,
  getProductDescription,
  getPublicMenuConfig,
  getVariantImages,
  getVariantTags,
  removeTagFromVariant,
  updateProductAvailability,
  updateProductDescription,
  updateVariantAvailability,
  updateVariantImageOrder,
  uploadVariantImage,
} from '../../services/adminApi'
import type { ImageResponse, TagResponse } from '../../services/adminApi'
import {
  formatPrice,
  getVariantTagNames,
  normalizeVariantModifiers,
  parseMenu,
  parseProduct,
  resolveMediaUrl,
} from '../../services/menu'
import type { MenuProduct, MenuResponse } from '../../services/menu'
import { useApi } from '../../services/useApi'
import { downloadQrAsPng, generateQrMatrix } from '../../utils/qr'
import '../public/connection.css'
import './admin.css'

type AdminTab = 'catalog' | 'availability' | 'enrich' | 'qr'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

// HU-008: Consulta administrativa del catálogo sincronizado
function SyncedProductInspector({ id, currency }: { id: number; currency: string }) {
  const { result: detailResult } = useApi(`/api/menu/${encodeURIComponent(id)}`, parseProduct)

  if (detailResult.status === 'loading') {
    return <p className="muted">Cargando estructura comercial del producto #{id}…</p>
  }

  if (detailResult.status === 'error') {
    return (
      <div className="notice error">
        <p>{detailResult.message}</p>
      </div>
    )
  }

  const detailedProduct = detailResult.data?.product ?? null
  if (!detailedProduct) {
    return <p className="muted">No se encontró información detallada del producto.</p>
  }

  return (
    <div className="synced-detail">
      <h3>{detailedProduct.name} (ID #{detailedProduct.product_id})</h3>
      <p className="muted">
        {detailedProduct.description || 'Sin descripción local configurada.'}
      </p>

      <h4>Variantes y precios sincronizados ({detailedProduct.variants.length})</h4>
      <div className="admin-variants-stack">
        {detailedProduct.variants.map((v) => {
          const modGroups = normalizeVariantModifiers(v.modifiers)
          const vTags = getVariantTagNames(v)
          return (
            <div key={v.product_variant_id} className="admin-variant-box">
              <div className="variant-box-header">
                <strong>{v.name} (Variante #{v.product_variant_id})</strong>
                <span className="price">{formatPrice(v.price, currency)}</span>
              </div>
              <p className="muted">
                Estado local: <strong>{v.is_available ? 'Disponible' : 'Agotado'}</strong> · Solicitable: <strong>{v.can_order ? 'Sí' : 'No'}</strong>
              </p>

              {vTags.length > 0 && (
                <div className="public-tags-row" style={{ marginBottom: '0.5rem' }}>
                  {vTags.map((t) => (
                    <span key={t} className="public-tag-pill">{t}</span>
                  ))}
                </div>
              )}

              {modGroups.length > 0 ? (
                <div className="synced-modifiers">
                  <strong>Grupos de modificadores ({modGroups.length}):</strong>
                  {modGroups.map((g) => (
                    <div key={g.id} className="synced-mod-group">
                      <span>• {g.name}: </span>
                      {g.complements.length > 0 ? (
                        <span>
                          {g.complements
                            .map((c) => `${c.name} (+${formatPrice(c.price, currency)})`)
                            .join(', ')}
                        </span>
                      ) : (
                        <span className="muted">Sin complementos</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">Sin modificadores asignados a esta variante.</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CatalogSyncedSection({
  products,
  currency,
  onRefresh,
}: {
  products: MenuProduct[]
  currency: string
  onRefresh: () => void
}) {
  const [inspectId, setInspectId] = useState<number | null>(
    products.length > 0 ? products[0].product_id : null
  )

  return (
    <div className="admin-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">HU-008 · Integración Loyverse</p>
          <h2>Consulta administrativa del catálogo sincronizado</h2>
          <p className="muted">
            Inspecciona productos activos/inactivos, presentaciones, precios comerciales y grupos de modificadores.
          </p>
        </div>
        <button type="button" className="btn-outlined" onClick={onRefresh}>
          ↻ Refrescar catálogo
        </button>
      </div>

      {products.length === 0 ? (
        <div className="notice">
          <p>Todavía no existen productos sincronizados desde Loyverse en la base de datos.</p>
        </div>
      ) : (
        <div className="admin-split-grid">
          <div className="panel">
            <h3>Productos sincronizados ({products.length})</h3>
            <ul className="admin-item-list">
              {products.map((prod) => (
                <li
                  key={prod.product_id}
                  className={`admin-list-row ${inspectId === prod.product_id ? 'selected' : ''}`}
                >
                  <div>
                    <strong>{prod.name}</strong>
                    <div className="badge-row">
                      <span className={`availability ${prod.is_active ? 'available' : 'sold-out'}`}>
                        {prod.is_active ? 'Comercialmente Activo' : 'Inactivo en Loyverse'}
                      </span>
                      <span className={`availability ${prod.is_available ? 'available' : 'sold-out'}`}>
                        {prod.is_available ? 'Disponible local' : 'Agotado local'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setInspectId(prod.product_id)}
                  >
                    Inspeccionar
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel">
            {inspectId === null ? (
              <p className="muted">Selecciona un producto para ver sus variantes y modificadores.</p>
            ) : (
              <SyncedProductInspector key={inspectId} id={inspectId} currency={currency} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// HU-007: Gestionar disponibilidad de productos
function AvailabilitySection({
  products,
  currency,
  onUpdated,
}: {
  products: MenuProduct[]
  currency: string
  onUpdated: () => void
}) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const handleToggleProduct = async (product: MenuProduct) => {
    const nextState = !product.is_available
    setBusyId(`p-${product.product_id}`)
    setFeedback(null)
    try {
      await updateProductAvailability(product.product_id, nextState)
      setFeedback({
        type: 'ok',
        text: `Producto «${product.name}» marcado como ${nextState ? 'DISPONIBLE' : 'AGOTADO'}.`,
      })
      onUpdated()
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Error al actualizar disponibilidad del producto.',
      })
    } finally {
      setBusyId(null)
    }
  }

  const handleToggleVariant = async (variantId: number, variantName: string, currentAvailable: boolean) => {
    const nextState = !currentAvailable
    setBusyId(`v-${variantId}`)
    setFeedback(null)
    try {
      await updateVariantAvailability(variantId, nextState)
      setFeedback({
        type: 'ok',
        text: `Presentación «${variantName}» marcada como ${nextState ? 'DISPONIBLE' : 'AGOTADA'}.`,
      })
      onUpdated()
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Error al actualizar disponibilidad de la variante.',
      })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="admin-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">HU-007 · Control operativo local</p>
          <h2>Gestionar disponibilidad de productos</h2>
          <p className="muted">
            Marca platillos como agotados o restablece su disponibilidad en tiempo real sin alterar el inventario de Loyverse.
          </p>
        </div>
      </div>

      {feedback && (
        <div className={`notice ${feedback.type === 'err' ? 'error' : ''}`} role="status">
          <p>{feedback.text}</p>
        </div>
      )}

      <div className="product-grid">
        {products.map((product) => {
          const isUpdatingProd = busyId === `p-${product.product_id}`
          return (
            <article key={product.product_id} className="panel availability-card">
              <div className="product-header-row">
                <div>
                  <h3>{product.name}</h3>
                  <span className={`availability ${product.is_available ? 'available' : 'sold-out'}`}>
                    {product.is_available ? 'Disponible en menú' : 'Agotado temporalmente'}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isUpdatingProd}
                  className={product.is_available ? 'btn-inverted' : 'btn-primary'}
                  onClick={() => void handleToggleProduct(product)}
                >
                  {isUpdatingProd
                    ? 'Guardando…'
                    : product.is_available
                      ? 'Marcar Agotado'
                      : 'Restablecer disponible'}
                </button>
              </div>

              <ul className="variants">
                {product.variants.map((v) => {
                  const isUpdatingVar = busyId === `v-${v.product_variant_id}`
                  return (
                    <li key={v.product_variant_id}>
                      <span>
                        <strong>{v.name}</strong> ({formatPrice(v.price, currency)})
                        <small className={v.is_available ? '' : 'status-dot-out'}>
                          {v.is_available ? 'Disponible' : 'Agotada'}
                        </small>
                      </span>
                      <button
                        type="button"
                        className="btn-outlined btn-sm"
                        disabled={isUpdatingVar}
                        onClick={() => void handleToggleVariant(v.product_variant_id, v.name, v.is_available)}
                      >
                        {isUpdatingVar ? '…' : v.is_available ? 'Agotar variante' : 'Habilitar'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </article>
          )
        })}
      </div>
    </div>
  )
}

// HU-005: Enriquecer información de productos (Descripciones, Fotografías y Etiquetas)
function EnrichProductsSection({
  products,
  onCatalogChanged,
}: {
  products: MenuProduct[]
  onCatalogChanged: () => void
}) {
  const [selectedProductId, setSelectedProductId] = useState<number>(
    products[0]?.product_id ?? 0
  )
  const selectedProduct = useMemo(
    () => products.find((p) => p.product_id === selectedProductId) ?? products[0] ?? null,
    [products, selectedProductId]
  )
  const activeProductId = selectedProduct?.product_id ?? 0

  const [selectedVariantId, setSelectedVariantId] = useState<number>(
    selectedProduct?.variants[0]?.product_variant_id ?? 0
  )

  const activeVariantId = useMemo(() => {
    if (!selectedProduct || selectedProduct.variants.length === 0) return 0
    const exists = selectedProduct.variants.some((v) => v.product_variant_id === selectedVariantId)
    return exists ? selectedVariantId : selectedProduct.variants[0].product_variant_id
  }, [selectedProduct, selectedVariantId])

  // Estado para Descripción
  const [descriptionText, setDescriptionText] = useState<string>(
    () => selectedProduct?.description ?? ''
  )
  const [savingDesc, setSavingDesc] = useState(false)

  // Estado para Fotografías por Variante
  const [images, setImages] = useState<ImageResponse[]>([])
  const [loadingImages, setLoadingImages] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [displayOrder, setDisplayOrder] = useState<number>(1)
  const [uploadingImg, setUploadingImg] = useState(false)

  // Estado para Etiquetas por Variante
  const [allTags, setAllTags] = useState<TagResponse[]>([])
  const [variantTags, setVariantTags] = useState<TagResponse[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [busyTag, setBusyTag] = useState(false)

  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  // Consultar descripción solo cuando cambia el ID del producto seleccionado
  useEffect(() => {
    if (!activeProductId) return
    let cancelled = false
    getProductDescription(activeProductId)
      .then((res) => {
        if (!cancelled) setDescriptionText(res.description ?? '')
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [activeProductId])

  // Función auxiliar para recargar fotos y etiquetas tras una acción del usuario sin perder selección
  const reloadVariantMediaAndTags = useCallback(async (variantId: number) => {
    if (!variantId) return
    try {
      const [imgs, vTags, catalogTags] = await Promise.all([
        getVariantImages(variantId),
        getVariantTags(variantId),
        getAllTags(),
      ])
      setImages(imgs)
      setVariantTags(vTags)
      setAllTags(catalogTags)
      setDisplayOrder(imgs.length + 1)
    } catch (err) {
      setNotice({
        type: 'err',
        msg: err instanceof Error ? err.message : 'Error al consultar imágenes o etiquetas de la variante.',
      })
    } finally {
      setLoadingImages(false)
    }
  }, [])

  // Carga inicial o cuando el usuario cambia de variante en el selector
  useEffect(() => {
    if (!activeVariantId) return
    let cancelled = false
    Promise.all([
      getVariantImages(activeVariantId),
      getVariantTags(activeVariantId),
      getAllTags(),
    ])
      .then(([imgs, vTags, catalogTags]) => {
        if (cancelled) return
        setImages(imgs)
        setVariantTags(vTags)
        setAllTags(catalogTags)
        setDisplayOrder(imgs.length + 1)
      })
      .catch((err) => {
        if (cancelled) return
        setNotice({
          type: 'err',
          msg: err instanceof Error ? err.message : 'Error al consultar imágenes o etiquetas de la variante.',
        })
      })
      .finally(() => {
        if (!cancelled) setLoadingImages(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeVariantId])

  // Limpiar URL de vista previa
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleProductSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const nextProdId = Number(e.target.value)
    setSelectedProductId(nextProdId)
    setNotice(null)
    const nextProd = products.find((p) => p.product_id === nextProdId)
    if (nextProd) {
      setDescriptionText(nextProd.description ?? '')
      const firstVarId = nextProd.variants[0]?.product_variant_id ?? 0
      setSelectedVariantId(firstVarId)
      setLoadingImages(true)
    }
  }

  const handleVariantSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedVariantId(Number(e.target.value))
    setNotice(null)
    setLoadingImages(true)
  }

  const handleSaveDescription = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) return
    setSavingDesc(true)
    setNotice(null)
    try {
      const clean = descriptionText.trim()
      const res = await updateProductDescription(
        selectedProduct.product_id,
        clean.length > 0 ? clean : null
      )
      setDescriptionText(res.description ?? '')
      setNotice({ type: 'ok', msg: `Descripción de «${selectedProduct.name}» guardada correctamente.` })
      onCatalogChanged()
    } catch (err) {
      setNotice({
        type: 'err',
        msg: err instanceof Error ? err.message : 'No se pudo guardar la descripción.',
      })
    } finally {
      setSavingDesc(false)
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setNotice(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (!file) {
      setSelectedFile(null)
      return
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setNotice({
        type: 'err',
        msg: 'Formato no admitido. Selecciona únicamente imágenes JPG, PNG o WebP.',
      })
      e.target.value = ''
      setSelectedFile(null)
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setNotice({
        type: 'err',
        msg: `La imagen supera el tamaño máximo permitido de 5 MB (${(file.size / (1024 * 1024)).toFixed(2)} MB).`,
      })
      e.target.value = ''
      setSelectedFile(null)
      return
    }
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleUploadImage = async (e: FormEvent) => {
    e.preventDefault()
    if (!activeVariantId || !selectedFile) return
    setUploadingImg(true)
    setNotice(null)
    try {
      await uploadVariantImage(activeVariantId, selectedFile, displayOrder)
      setSelectedFile(null)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
      setNotice({ type: 'ok', msg: 'Fotografía cargada y vinculada a la variante exitosamente.' })
      await reloadVariantMediaAndTags(activeVariantId)
      onCatalogChanged()
    } catch (err) {
      setNotice({
        type: 'err',
        msg: err instanceof Error ? err.message : 'Error al subir la fotografía.',
      })
    } finally {
      setUploadingImg(false)
    }
  }

  const handleDeleteImage = async (imageId: number) => {
    if (!activeVariantId) return
    setNotice(null)
    try {
      await deleteVariantImage(activeVariantId, imageId)
      setNotice({ type: 'ok', msg: 'Fotografía eliminada.' })
      await reloadVariantMediaAndTags(activeVariantId)
      onCatalogChanged()
    } catch (err) {
      setNotice({
        type: 'err',
        msg: err instanceof Error ? err.message : 'No se pudo eliminar la fotografía.',
      })
    }
  }

  const handleReorderImage = async (imageId: number, nextOrder: number) => {
    if (!activeVariantId || nextOrder < 0) return
    try {
      await updateVariantImageOrder(activeVariantId, imageId, nextOrder)
      await reloadVariantMediaAndTags(activeVariantId)
      onCatalogChanged()
    } catch (err) {
      setNotice({
        type: 'err',
        msg: err instanceof Error ? err.message : 'Error al cambiar el orden de la imagen.',
      })
    }
  }

  const handleCreateTag = async (e: FormEvent) => {
    e.preventDefault()
    if (!newTagName.trim()) return
    setBusyTag(true)
    setNotice(null)
    try {
      const created = await createTag(newTagName)
      setNewTagName('')
      setAllTags((prev) => [...prev, created])
      if (activeVariantId) {
        await assignTagToVariant(activeVariantId, created.tag_id)
        await reloadVariantMediaAndTags(activeVariantId)
        onCatalogChanged()
      }
      setNotice({ type: 'ok', msg: `Etiqueta «${created.name}» creada y asignada.` })
    } catch (err) {
      setNotice({
        type: 'err',
        msg: err instanceof Error ? err.message : 'No se pudo crear la etiqueta.',
      })
    } finally {
      setBusyTag(false)
    }
  }

  const handleToggleVariantTag = async (tag: TagResponse) => {
    if (!activeVariantId) return
    setBusyTag(true)
    setNotice(null)
    const isAssigned = variantTags.some((t) => t.tag_id === tag.tag_id)
    try {
      if (isAssigned) {
        await removeTagFromVariant(activeVariantId, tag.tag_id)
        setNotice({ type: 'ok', msg: `Etiqueta «${tag.name}» retirada de la variante.` })
      } else {
        await assignTagToVariant(activeVariantId, tag.tag_id)
        setNotice({ type: 'ok', msg: `Etiqueta «${tag.name}» asociada a la variante.` })
      }
      await reloadVariantMediaAndTags(activeVariantId)
      onCatalogChanged()
    } catch (err) {
      setNotice({
        type: 'err',
        msg: err instanceof Error ? err.message : 'Error al actualizar etiquetas de la variante.',
      })
    } finally {
      setBusyTag(false)
    }
  }

  if (!selectedProduct) {
    return <p className="notice">No hay productos sincronizados para enriquecer.</p>
  }

  return (
    <div className="admin-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">HU-005 · Presentación del menú</p>
          <h2>Enriquecer información de productos</h2>
          <p className="muted">
            Administra descripciones locales por producto, así como fotografías (JPG, PNG, WebP hasta 5 MB) y etiquetas por variante.
          </p>
        </div>
      </div>

      {notice && (
        <div className={`notice ${notice.type === 'err' ? 'error' : ''}`} role="status">
          <p>{notice.msg}</p>
        </div>
      )}

      <div className="panel selector-bar">
        <label className="form-field">
          <span>1. Selecciona el producto</span>
          <select
            value={selectedProduct.product_id}
            onChange={handleProductSelectChange}
          >
            {products.map((p) => (
              <option key={p.product_id} value={p.product_id}>
                {p.name} (#{p.product_id})
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>2. Selecciona la variante (para fotografías y etiquetas)</span>
          <select
            value={activeVariantId}
            onChange={handleVariantSelectChange}
          >
            {selectedProduct.variants.map((v) => (
              <option key={v.product_variant_id} value={v.product_variant_id}>
                {v.name} — ${v.price} (#{v.product_variant_id})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="admin-split-grid">
        {/* Edición de Descripción General */}
        <form className="panel admin-form" onSubmit={handleSaveDescription}>
          <h3>Descripción general de «{selectedProduct.name}»</h3>
          <p className="muted">
            Se conserva en PostgreSQL (`Products.description`) y las sincronizaciones con Loyverse no la sobrescriben.
          </p>
          <label className="form-field">
            <span>Descripción para el comensal</span>
            <textarea
              rows={4}
              value={descriptionText}
              onChange={(e) => setDescriptionText(e.target.value)}
              placeholder="Escribe los ingredientes, preparación o notas saludables del platillo…"
            />
          </label>
          <button type="submit" className="btn-primary" disabled={savingDesc}>
            {savingDesc ? 'Guardando descripción…' : 'Guardar descripción'}
          </button>
        </form>

        {/* Administración de Etiquetas por Variante */}
        <div className="panel">
          <h3>Etiquetas de la variante seleccionada</h3>
          <p className="muted">
            Haz clic en una etiqueta para asociarla o retirarla de esta presentación (`ProductTags`).
          </p>

          <div className="tags-cloud">
            {allTags.length === 0 ? (
              <p className="muted">No hay etiquetas creadas todavía.</p>
            ) : (
              allTags.map((tag) => {
                const active = variantTags.some((vt) => vt.tag_id === tag.tag_id)
                return (
                  <button
                    key={tag.tag_id}
                    type="button"
                    disabled={busyTag}
                    onClick={() => void handleToggleVariantTag(tag)}
                    className={`tag-chip ${active ? 'active' : ''}`}
                  >
                    {active ? '✓ ' : '+ '}
                    {tag.name}
                  </button>
                )
              })
            )}
          </div>

          <form onSubmit={handleCreateTag} className="inline-tag-form">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Nueva etiqueta (ej. Vegano, Sin Gluten)…"
              required
            />
            <button type="submit" className="btn-secondary" disabled={busyTag}>
              Crear y asignar
            </button>
          </form>
        </div>
      </div>

      {/* Administración de Fotografías por Variante */}
      <div className="panel">
        <h3>Fotografías de la variante (#{activeVariantId})</h3>
        <p className="muted">
          Formatos admitidos: <strong>JPG, PNG o WebP</strong> · Tamaño máximo: <strong>5 MB</strong>.
        </p>

        <div className="admin-split-grid">
          <form onSubmit={handleUploadImage} className="admin-form">
            <label className="form-field">
              <span>Seleccionar archivo de imagen</span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
              />
            </label>

            <label className="form-field">
              <span>Orden de presentación (`display_order`)</span>
              <input
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
              />
            </label>

            {previewUrl && (
              <div className="image-preview-box">
                <span className="eyebrow">Vista previa antes de guardar</span>
                <img src={previewUrl} alt="Vista previa" className="upload-preview-img" />
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={!selectedFile || uploadingImg}
            >
              {uploadingImg ? 'Subiendo fotografía…' : 'Guardar fotografía en variante'}
            </button>
          </form>

          <div>
            <h4>Galería registrada ({images.length})</h4>
            {loadingImages ? (
              <p className="muted">Cargando fotografías…</p>
            ) : images.length === 0 ? (
              <p className="muted">Esta variante aún no tiene fotografías registradas.</p>
            ) : (
              <div className="admin-gallery-grid">
                {images.map((img) => {
                  const fullUrl = resolveMediaUrl(img.image_url)
                  return (
                    <div key={img.product_image_id} className="gallery-item-card">
                      {fullUrl && <img src={fullUrl} alt={`Imagen #${img.product_image_id}`} />}
                      <div className="gallery-item-Controls">
                        <span>Orden: <strong>{img.display_order}</strong></span>
                        <div className="gallery-btn-row">
                          <button
                            type="button"
                            className="btn-outlined btn-sm"
                            onClick={() => void handleReorderImage(img.product_image_id, Math.max(0, img.display_order - 1))}
                            title="Subir prioridad"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="btn-outlined btn-sm"
                            onClick={() => void handleReorderImage(img.product_image_id, img.display_order + 1)}
                            title="Bajar prioridad"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="btn-inverted btn-sm"
                            onClick={() => void handleDeleteImage(img.product_image_id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// HU-004: Generar código QR general del menú
function QrGeneratorSection() {
  const [backendMenuUrl, setBackendMenuUrl] = useState<string | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [configError, setConfigError] = useState<string | null>(null)
  const [useFallbackOrigin, setUseFallbackOrigin] = useState(false)

  useEffect(() => {
    let cancelled = false
    getPublicMenuConfig()
      .then((res) => {
        if (cancelled) return
        setBackendMenuUrl(res.menu_url)
        setConfigError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setConfigError(err instanceof Error ? err.message : 'No se pudo consultar /api/menu/config.')
      })
      .finally(() => {
        if (!cancelled) setLoadingConfig(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const localOriginUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : 'http://localhost:5173/'
  const activeUrl = backendMenuUrl || (useFallbackOrigin ? localOriginUrl : null)

  const qrMatrix = useMemo(() => {
    if (!activeUrl) return null
    try {
      return generateQrMatrix(activeUrl)
    } catch {
      return null
    }
  }, [activeUrl])

  return (
    <div className="admin-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">HU-004 · Acceso general en restaurante</p>
          <h2>Código QR del Menú Digital</h2>
          <p className="muted">
            Genera, descarga e imprime el código QR general para que los comensales abran el menú digital desde su dispositivo móvil.
          </p>
        </div>
      </div>

      {loadingConfig ? (
        <p className="notice">Consultando dirección pública configurada en `/api/menu/config`…</p>
      ) : (
        <>
          {configError && (
            <div className="notice error" role="alert">
              <p>{configError}</p>
            </div>
          )}

          {!backendMenuUrl && (
            <div className="notice" role="status">
              <div>
                <strong>Aviso de configuración (`menu_url: null`):</strong>
                <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                  El backend aún no tiene una dirección pública permanente configurada en `GET /api/menu/config`. Puedes previsualizar y probar el código QR utilizando la dirección actual del navegador (`{localOriginUrl}`).
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setUseFallbackOrigin((prev) => !prev)}
              >
                {useFallbackOrigin ? 'Ocultar QR de prueba local' : 'Generar con dirección actual'}
              </button>
            </div>
          )}

          {activeUrl && qrMatrix && (
            <div className="panel qr-showcase-card">
              <div className="qr-printable-area">
                <span className="eyebrow">mitbol · Cocina Saludable</span>
                <h3>Escanea para ver nuestro menú</h3>
                <div className="qr-svg-container">
                  <svg
                    viewBox={`0 0 ${qrMatrix.length + 8} ${qrMatrix.length + 8}`}
                    className="qr-svg"
                    role="img"
                    aria-label={`Código QR hacia ${activeUrl}`}
                  >
                    <rect width="100%" height="100%" fill="#FFFFFF" />
                    {qrMatrix.map((row, rIdx) =>
                      row.map((cell, cIdx) =>
                        cell ? (
                          <rect
                            key={`${rIdx}-${cIdx}`}
                            x={cIdx + 4}
                            y={rIdx + 4}
                            width={1}
                            height={1}
                            fill="#1E293B"
                          />
                        ) : null
                      )
                    )}
                  </svg>
                </div>
                <p className="qr-url-label">
                  Dirección del menú: <a href={activeUrl} target="_blank" rel="noreferrer">{activeUrl}</a>
                </p>
              </div>

              <div className="qr-actions-column">
                <h4>Opciones para el restaurante</h4>
                <p className="muted">
                  Este código QR es general para el restaurante (no por mesa) y dirige directamente al menú público sin requerir inicio de sesión.
                </p>
                <div className="hero-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => downloadQrAsPng(qrMatrix, 'mitbol-qr-menu.png')}
                  >
                    ⬇ Descargar imagen PNG
                  </button>
                  <button
                    type="button"
                    className="btn-outlined"
                    onClick={() => window.print()}
                  >
                    🖨 Imprimir código QR
                  </button>
                  <a href={activeUrl} target="_blank" rel="noreferrer" className="btn-secondary">
                    ↗ Verificar dirección del menú
                  </a>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function AdminDashboardPage() {
  const { user, logout, isAdmin } = useAuth()
  const { result, retry } = useApi('/api/menu', parseMenu)
  const [activeTab, setActiveTab] = useState<AdminTab>('availability')
  const [cachedMenu, setCachedMenu] = useState<MenuResponse | null>(null)

  if (result.status === 'success' && result.data && result.data !== cachedMenu) {
    setCachedMenu(result.data)
  }

  const activeData = result.status === 'success' ? result.data : cachedMenu
  const products = activeData ? activeData.products : []
  const currency = activeData ? activeData.currency : 'MXN'

  return (
    <div className="connection-page">
      <header className="site-header no-print">
        <div className="brand-logo">
          <div className="brand-text">
            <span className="brand-title">
              mitb<span className="brand-o">o</span>l
            </span>
            <span className="brand-subtitle">PANEL ADMINISTRATIVO Y OPERATIVO</span>
          </div>
        </div>

        <div className="admin-user-bar">
          {user && (
            <span className="user-pill">
              <strong>{user.name}</strong> ({user.roles.join(', ') || 'Personal'})
            </span>
          )}
          <Link to="/" className="btn-outlined">Ver menú público</Link>
          <button type="button" className="btn-inverted" onClick={() => void logout()}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <nav className="admin-tabs no-print" aria-label="Secciones administrativas">
        <button
          type="button"
          className={`pill-nav-item ${activeTab === 'availability' ? 'active' : ''}`}
          onClick={() => setActiveTab('availability')}
        >
          Disponibilidad (HU-007)
        </button>
        <button
          type="button"
          className={`pill-nav-item ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          Catálogo Sincronizado (HU-008)
        </button>
        {isAdmin && (
          <button
            type="button"
            className={`pill-nav-item ${activeTab === 'enrich' ? 'active' : ''}`}
            onClick={() => setActiveTab('enrich')}
          >
            Enriquecer Productos (HU-005)
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            className={`pill-nav-item ${activeTab === 'qr' ? 'active' : ''}`}
            onClick={() => setActiveTab('qr')}
          >
            Código QR (HU-004)
          </button>
        )}
      </nav>

      <main>
        {result.status === 'loading' && !activeData && (
          <div className="notice"><p>Cargando productos desde el backend…</p></div>
        )}
        {result.status === 'error' && !activeData && (
          <div className="notice error">
            <p>{result.message}</p>
            <button type="button" className="btn-inverted" onClick={retry}>Reintentar</button>
          </div>
        )}
        {activeData && (
          <>
            {activeTab === 'availability' && (
              <AvailabilitySection products={products} currency={currency} onUpdated={retry} />
            )}
            {activeTab === 'catalog' && (
              <CatalogSyncedSection products={products} currency={currency} onRefresh={retry} />
            )}
            {activeTab === 'enrich' && (
              <EnrichProductsSection products={products} onCatalogChanged={retry} />
            )}
            {activeTab === 'qr' && <QrGeneratorSection />}
          </>
        )}
      </main>
    </div>
  )
}