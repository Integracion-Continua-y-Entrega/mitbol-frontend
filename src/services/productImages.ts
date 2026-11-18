import { requestApi } from './config'
import { getProductImageUrls, parseProduct } from './menu'

const pendingRequests = new Map<number, Promise<string[]>>()

/** El listado no incluye galerías: consultarlas solo si sus portadas fallan. */
export function loadProductImageAlternatives(productId: number): Promise<string[]> {
  const pending = pendingRequests.get(productId)
  if (pending) return pending

  const request = requestApi(`/api/menu/${encodeURIComponent(productId)}`)
    .then(parseProduct)
    .then(detail => detail?.product ? getProductImageUrls(detail.product) : [])
  pendingRequests.set(productId, request)
  const clear = () => { pendingRequests.delete(productId) }
  void request.then(clear, clear)
  return request
}
