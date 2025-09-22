import { ApiClient } from '@/lib/client/api-client'

export abstract class BaseRepository {
  protected constructor(protected readonly client: ApiClient) {}

  protected get<T>(url: string, init?: RequestInit) {
    return this.client.get<T>(url, init)
  }

  protected post<T>(url: string, body?: unknown, init?: RequestInit) {
    return this.client.post<T>(url, body, init)
  }

  protected put<T>(url: string, body?: unknown, init?: RequestInit) {
    return this.client.put<T>(url, body, init)
  }

  protected patch<T>(url: string, body?: unknown, init?: RequestInit) {
    return this.client.patch<T>(url, body, init)
  }

  protected delete<T>(url: string, init?: RequestInit) {
    return this.client.delete<T>(url, init)
  }
}
