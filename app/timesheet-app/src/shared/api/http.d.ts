// Type declarations for the http.js API client module

interface ApiRequestOptions extends RequestInit {
    responseType?: 'blob'
}

interface ApiClient {
    get: (url: string, params?: Record<string, any>, options?: ApiRequestOptions) => Promise<any>
    post: (url: string, body?: any, options?: ApiRequestOptions) => Promise<any>
    put: (url: string, body?: any, options?: ApiRequestOptions) => Promise<any>
    patch: (url: string, body?: any, options?: ApiRequestOptions) => Promise<any>
    delete: (url: string, body?: any, options?: ApiRequestOptions) => Promise<any>
}

export declare const api: ApiClient
