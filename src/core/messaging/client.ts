import { beginRequest, endRequest, shouldTrackPayload } from './busy'
import type { RpcMethod, RpcRequest, RpcResponse, RpcResults } from './protocol'

export type RpcTransport = (request: RpcRequest) => Promise<RpcResponse>

let transport: RpcTransport | null = null

export function setRpcTransport(next: RpcTransport): void {
  transport = next
}

export function createChromeTransport(): RpcTransport {
  return async (request) => {
    const api = (globalThis as { browser?: any; chrome?: any }).browser ?? (globalThis as { chrome?: any }).chrome
    const response = (await api.runtime.sendMessage(request)) as RpcResponse
    return response
  }
}

export function createDirectTransport(handler: (req: RpcRequest) => Promise<RpcResponse>): RpcTransport {
  return handler
}

export async function rpc<M extends RpcMethod>(method: M, payload?: unknown): Promise<RpcResults[M]> {
  if (!transport) throw new Error('RPC transport is not configured')
  const track = shouldTrackPayload(payload)
  if (track) beginRequest()
  try {
    const request: RpcRequest = { id: globalThis.crypto.randomUUID(), method, payload }
    const response = await transport(request)
    if (!response.ok) {
      throw Object.assign(new Error(response.error.message), { code: response.error.code, kind: response.error.kind })
    }
    return response.data as RpcResults[M]
  } finally {
    if (track) endRequest()
  }
}
