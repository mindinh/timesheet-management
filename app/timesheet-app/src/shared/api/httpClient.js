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

    // Provide an actual Authorization header so CDS doesn't bounce with 401 Basic challenge
    // The exact credentials depend on the mock user. 
    // We try to match the mock users created: diana/diana, alice/alice, bob/bob, etc.
    let authHeader = {};
    if (mockUserId) {
        // e.g. mapping internal ID back to username, or just deriving from mockUserId
        // We know 'e6a003c4-5d78-6f90-b023-c3d4e5f6a7b8' is diana
        let userPass = "";
        if (mockUserId === 'e6a003c4-5d78-6f90-b023-c3d4e5f6a7b8') userPass = "diana:diana";
        else if (mockUserId === '2b7a2d96-0e94-4d13-8a03-7f8a70562590') userPass = "alice:alice";
        else if (mockUserId === 'c4e8f1a2-3b56-4d78-9e01-a1b2c3d4e5f6') userPass = "bob:bob";
        else if (mockUserId === 'd5f902b3-4c67-5e89-af12-b2c3d4e5f6a7') userPass = "charlie:charlie";
        else userPass = "diana:diana"; // fallback

        authHeader = { "Authorization": `Basic ${btoa(userPass)}` };
    } else {
        // If not impersonating, use Diana as default to avoid popup
        authHeader = { "Authorization": `Basic ${btoa('diana:diana')}` };
    }

    const headers = {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...mockUserHeader,
        ...authHeader,
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

