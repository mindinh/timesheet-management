export class ApiError extends Error {
    endpoint;
    status;
    code;
    severity;
    details;

    constructor(
        endpoint,
        message,
        status,
        details
    ) {
        super(message);
        this.name = "ApiError";
        this.endpoint = endpoint;
        this.status = status;
        this.details = details;

        // Parse backend error format nếu có
        if (
            details &&
            typeof details === "object" &&
            "error" in (details)
        ) {
            const error = (details).error;

            this.message = error.message ?? message;
            this.code = error.code;
            this.severity = error["@Common.numericSeverity"];
        }
    }
}
