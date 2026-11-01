from fastapi import Request


def get_client_ip(request: Request) -> str | None:
    """Return the client IP from the request, or None if unavailable.

    Shared helper used across the API routers for audit-logging the
    source of authentication and authorization events.
    """

    if request.client is None:
        return None

    return request.client.host
