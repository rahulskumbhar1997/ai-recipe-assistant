from typing import Any, Dict, Optional


class APIRateLimitException(Exception):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}

    def to_response(self) -> dict:
        return {
            "error": "rate_limited",
            "message": self.message,
            "details": self.details,
        }