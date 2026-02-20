import { apiFetch } from "./httpClient";

// ====== Helper ======
const buildQueryString = (params) => {
    if (!params) return "";

    return Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(
            ([k, v]) =>
                `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
        )
        .join("&");
};

const getLanguage = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("sap-locale") || "en";
};

// ====== API Client ======
export const api = {
    get: async (url, params, options = {}) => {
        const [baseUrl, queryPart] = url.split("?");
        const existingParams = new URLSearchParams(queryPart);
        const mergedParams = {
            ...Object.fromEntries(existingParams.entries()),
            ...params,
        };

        const queryString = buildQueryString(mergedParams);
        const finalUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;

        const language = getLanguage();
        console.log("API GET", finalUrl, { language });
        return apiFetch(finalUrl, {
            method: "GET",
            headers: {
                "Accept-Language": language,
                ...(options?.headers ?? {}),
            },
            ...options,
        });
    },

    post: async (url, body, options = {}) => {
        return apiFetch(url, {
            method: "POST",
            body: body instanceof FormData
                ? body
                : JSON.stringify(body ?? {}),
            headers: body instanceof FormData
                ? { "Accept": "application/json", "Accept-Language": getLanguage(), ...(options?.headers ?? {}) }
                : {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Accept-Language": getLanguage(),
                    ...(options?.headers ?? {})
                },
            ...options,
        });
    },


    put: async (url, body, options = {}) => {
        return apiFetch(url, {
            method: "PUT",
            body:
                body instanceof FormData
                    ? body
                    : JSON.stringify(body ?? {}),
            headers:
                body instanceof FormData
                    ? { "Accept-Language": getLanguage(), ...(options?.headers ?? {}) }
                    : { "Content-Type": "application/json", "Accept-Language": getLanguage(), ...(options?.headers ?? {}) },
            ...options,
        });
    },

    patch: async (url, body, options = {}) => {
        return apiFetch(url, {
            method: "PATCH",
            body:
                body instanceof FormData
                    ? body
                    : JSON.stringify(body ?? {}),
            headers:
                body instanceof FormData
                    ? { "Accept-Language": getLanguage(), ...(options?.headers ?? {}) }
                    : { "Content-Type": "application/json", "Accept-Language": getLanguage(), ...(options?.headers ?? {}) },
            ...options,
        });
    },

    delete: async (url, body, optionsParam = {}) => {
        const options = {
            method: "DELETE",
            headers: { "Content-Type": "application/json", "Accept-Language": getLanguage(), ...(optionsParam?.headers ?? {}) },
            ...optionsParam,
        };

        if (body instanceof FormData) {
            delete options.headers["Content-Type"];
            options.body = body;
        } else if (body) {
            options.body = JSON.stringify(body);
        }

        return apiFetch(url, options);
    },
};

