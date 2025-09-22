export interface ApiErrorOptions {
  data?: unknown
  cause?: unknown
}

export class ApiError extends Error {
  public readonly status: number
  public readonly data?: unknown
  public readonly cause?: unknown

  constructor(message: string, status: number, options: ApiErrorOptions = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = options.data
    this.cause = options.cause
  }
}

export class ApiClient {
  constructor(private readonly defaultInit: RequestInit = {}) {}

  async request<T>(input: string, init: RequestInit = {}): Promise<T> {
    const mergedInit = this.mergeInit(init)

    try {
      const response = await fetch(input, mergedInit)

      if (response.status === 204) {
        return undefined as T
      }

      const contentType = response.headers.get('content-type') || ''
      let responseData: unknown = null

      if (contentType.includes('application/json')) {
        try {
          responseData = await response.json()
        } catch (error) {
          throw new ApiError('Failed to parse JSON response', response.status, {
            cause: error,
          })
        }
      } else {
        try {
          responseData = await response.text()
        } catch (error) {
          throw new ApiError('Failed to read response', response.status, {
            cause: error,
          })
        }
      }

      if (!response.ok) {
        const message =
          (typeof responseData === 'object' && responseData !== null && 'message' in responseData)
            ? String((responseData as { message?: string }).message)
            : response.statusText || 'Request failed'

        throw new ApiError(message, response.status, {
          data: responseData,
        })
      }

      return responseData as T
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }

      const message = error instanceof Error ? error.message : 'Network request failed'
      throw new ApiError(message, 0, { cause: error })
    }
  }

  get<T>(url: string, init?: RequestInit) {
    return this.request<T>(url, { ...init, method: 'GET' })
  }

  post<T>(url: string, body?: unknown, init?: RequestInit) {
    return this.request<T>(url, this.withJsonBody(init, body, 'POST'))
  }

  put<T>(url: string, body?: unknown, init?: RequestInit) {
    return this.request<T>(url, this.withJsonBody(init, body, 'PUT'))
  }

  patch<T>(url: string, body?: unknown, init?: RequestInit) {
    return this.request<T>(url, this.withJsonBody(init, body, 'PATCH'))
  }

  delete<T>(url: string, init?: RequestInit) {
    return this.request<T>(url, { ...init, method: 'DELETE' })
  }

  private mergeInit(init: RequestInit): RequestInit {
    const headers = this.mergeHeaders(this.defaultInit.headers, init.headers)

    return {
      credentials: 'same-origin',
      ...this.defaultInit,
      ...init,
      headers,
    }
  }

  private withJsonBody(init: RequestInit = {}, body: unknown, method: string): RequestInit {
    const headers = this.mergeHeaders(this.defaultInit.headers, init.headers)

    if (body !== undefined && body !== null && !(body instanceof FormData)) {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
      }

      return {
        ...this.mergeInit({ ...init, method, headers }),
        body: typeof body === 'string' ? body : JSON.stringify(body),
      }
    }

    return this.mergeInit({ ...init, method, headers, body: body as BodyInit | null | undefined })
  }

  private mergeHeaders(...headersList: Array<RequestInit['headers'] | undefined>): Headers {
    const result = new Headers()

    headersList.forEach(headers => {
      if (!headers) return
      new Headers(headers).forEach((value, key) => {
        result.set(key, value)
      })
    })

    return result
  }
}

export const apiClient = new ApiClient()
