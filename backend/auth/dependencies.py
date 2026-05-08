import os
from typing import Any

import jwt
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_bearer = HTTPBearer()

_jwks_client: PyJWKClient | None = None
_jwt_issuer: str | None = None

_SUPPORTED_ALGORITHMS = ["RS256", "ES256"]


def _get_supabase_url() -> str:
    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    if not supabase_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_URL is not configured",
        )
    return supabase_url


def _get_jwt_issuer() -> str:
    global _jwt_issuer
    if _jwt_issuer is None:
        _jwt_issuer = os.getenv("SUPABASE_JWT_ISSUER", "").rstrip("/")
        if not _jwt_issuer:
            _jwt_issuer = f"{_get_supabase_url()}/auth/v1"
    return _jwt_issuer


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = os.getenv("SUPABASE_JWKS_URL", "").strip()
        if not jwks_url:
            jwks_url = f"{_get_supabase_url()}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url)
    return _jwks_client


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict[str, Any]:
    token = credentials.credentials
    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=_SUPPORTED_ALGORITHMS,
            audience="authenticated",
            issuer=_get_jwt_issuer(),
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    except PyJWKClientError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    return payload
