import { ApiError } from "./api-error";
import { getMockUserId } from "../lib/mock-user";

export async function apiFetch(
    endpoint,
    options
) {
    const baseUrl = "/api";
    const url = `${baseUrl}${endpoint}`;

    const isFormData = options?.body instanceof FormData;

    const mockUserId = getMockUserId();
    const mockUserHeader = mockUserId ? { "x-mock-user": mockUserId } : {};

    const headers = {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...mockUserHeader,
        ...(options?.headers ?? {}),
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers,

            credentials: "include",

        });

        // HTTP error (4xx / 5xx)
        if (!response.ok) {
            let errorBody = null;

            try {
                errorBody = await response.json();
            } catch {
                errorBody = await response.text().catch(() => null);
            }

            throw new ApiError(
                endpoint,
                `Request failed with status ${response.status} ${response.statusText}`,
                response.status,
                errorBody
            );
        }

        // No content
        if (response.status === 204) return null;

        // Blob response
        if (options?.responseType === 'blob') {
            const blob = await response.blob();
            return {
                data: blob,
                headers: response.headers
            };
        }

        // Parse JSON
        try {
            return (await response.json());
        } catch {
            throw new ApiError(
                endpoint,
                "Failed to parse JSON response",
                response.status
            );
        }
    } catch (err) {

        if (err instanceof ApiError) {
            console.error("[apiFetch] API Error:", {
                endpoint: err.endpoint,
                status: err.status,
                message: err.message,
                details: err.details,
            });
            throw err;
        }

        const unknownError =
            err instanceof Error
                ? err
                : new Error("Unknown error occurred during fetch");

        console.error(
            `[apiFetch] Unexpected Error at ${endpoint}:`,
            unknownError.message
        );

        throw new ApiError(
            endpoint,
            "Network or unexpected error occurred"
        );
    }
}

