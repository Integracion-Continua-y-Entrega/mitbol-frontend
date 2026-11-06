import { useState } from 'react'
import ProductCard from '../../components/ProductCard'
import { API_URL } from '../../services/config'
import { parseHealth, parseMenu, parseProduct } from '../../services/menu'
import { useApi } from '../../services/useApi'
import './connection.css'

function Loading() {
  return <p className="notice" role="status">Consultando el backend… El primer inicio en Render puede tardar hasta 90 segundos.</p>
}

function Failure({ message, retry }: { message: string; retry: () => void }) {
  return <div className="notice error" role="alert"><p>{message}</p><button onClick={retry}>Reintentar</button></div>
}

function BackendStatus() {
  const { result, retry } = useApi('/', parseHealth)
  return (
    <section className="backend panel" aria-labelledby="backend-heading" aria-live="polite">
      <div><p className="eyebrow">Conexión pública</p><h2 id="backend-heading">Estado del backend</h2><code>GET /</code></div>
      <div className="backend-result">
        {result.status === 'loading' && <Loading />}
        {result.status === 'error' && <Failure message={result.message} retry={retry} />}
        {result.status === 'success' && <>
          <p className="status-ok">● Backend conectado · HTTP 2xx</p>
          {result.data === null ? <p>El backend respondió sin contenido.</p> : <pre>{JSON.stringify(result.data, null, 2)}</pre>}
          <button className="secondary" onClick={retry}>Volver a comprobar</button>
        </>}
      </div>
    </section>
  )
}

function ProductDetail({ id, close }: { id: number; close: () => void }) {
  const { result, retry } = useApi(`/api/menu/${encodeURIComponent(id)}`, parseProduct)
  return (
    <section id="product-detail" className="panel detail" aria-labelledby="detail-heading" aria-live="polite">
      <div className="section-heading"><div><p className="eyebrow">Consulta individual</p><h2 id="detail-heading">Detalle del producto #{id}</h2></div><button className="secondary" onClick={close}>Cerrar detalle</button></div>
      <p><code>GET /api/menu/{id}</code></p>
      {result.status === 'loading' && <Loading />}
      {result.status === 'error' && <Failure message={result.message} retry={retry} />}
      {result.status === 'success' && (result.data?.product ? <>
        <p className="status-ok">Detalle recibido correctamente.</p>
        <ProductCard product={result.data.product} currency={result.data.currency} />
        <details><summary>Ver respuesta JSON del endpoint</summary><pre>{JSON.stringify(result.data, null, 2)}</pre></details>
        <button className="secondary" onClick={retry}>Volver a consultar detalle</button>
      </> : <div className="notice"><p>El endpoint respondió sin datos del producto.</p><button onClick={retry}>Reintentar</button></div>)}
    </section>
  )
}

export default function ConnectionPage() {
  const { result, retry } = useApi('/api/menu', parseMenu)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  return (
    <div className="connection-page">
      <header className="site-header"><a className="brand" href="/">MITBOL<span>MENÚ DIGITAL</span></a><span className="integration-label">Verificación de integración</span></header>
      <main>
        <div className="welcome"><p className="eyebrow">Bienvenido a la mesa</p><h1>El menú empieza<br />por una buena conexión.</h1><p>Estamos preparando el menú digital del restaurante. Esta página provisional permite comprobar la conexión y consultar nuestro catálogo público.</p></div>
        <BackendStatus />
        <section className="catalog" aria-labelledby="catalog-heading" aria-live="polite">
          <div className="section-heading"><div><p className="eyebrow">Desde nuestra cocina</p><h2 id="catalog-heading">Catálogo de prueba</h2><p className="muted">Productos recibidos del backend · <code>GET /api/menu</code></p></div><button className="secondary" onClick={retry}>Actualizar catálogo</button></div>
          {result.status === 'loading' && <Loading />}
          {result.status === 'error' && <Failure message={result.message} retry={retry} />}
          {result.status === 'success' && (result.data && result.data.products.length > 0 ? <>
            <p className="muted">Mostrando {Math.min(result.data.products.length, 6)} de {result.data.products.length} productos · Moneda: {result.data.currency}</p>
            <div className="product-grid">{result.data.products.slice(0, 6).map((product) => <ProductCard key={product.product_id} product={product} currency={result.data!.currency} onSelect={() => setSelectedId(product.product_id)} />)}</div>
          </> : <div className="notice"><p>El backend respondió correctamente, pero el catálogo está vacío.</p><button onClick={retry}>Reintentar</button></div>)}
        </section>
        {selectedId !== null ? <ProductDetail key={selectedId} id={selectedId} close={() => setSelectedId(null)} /> : <p className="detail-hint">Selecciona «Consultar detalle» para comprobar la consulta individual de un producto.</p>}
      </main>
      <footer><span>MITBOL · Menú digital del restaurante</span><span className="api-origin">API pública: {API_URL}</span><span>Página provisional de integración.</span></footer>
    </div>
  )
}
