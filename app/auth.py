"""Supabase Auth verification for dashboard API calls (PRD FR-16).

The frontend sends the user's Supabase access token as a bearer token.
Two verification paths:
  * SUPABASE_JWT_SECRET set  -> local HS256 verification with PyJWT (no network call)
  * otherwise                -> supabase.auth.get_user(token) (network call)
When Supabase is not configured (dev mode) auth is skipped so the app can be
demoed locally before a Supabase project exists.
"""
import logging
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import get_settings

logger = logging.getLogger("autotester.auth")
bearer = HTTPBearer(auto_error=False)


def _verify_with_secret(token: str) -> Optional[dict]:
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return {"sub": payload.get("sub"), "email": payload.get("email")}
    except jwt.PyJWTError as exc:
        logger.info("jwt rejected: %s", exc)
        return None


def _verify_with_supabase(token: str) -> Optional[dict]:
    from supabase import create_client

    settings = get_settings()
    try:
        client = create_client(settings.supabase_url, settings.supabase_service_role_key)
        user = client.auth.get_user(token).user
        return {"sub": user.id, "email": getattr(user, "email", None)}
    except Exception as exc:
        logger.info("supabase token rejected: %s", exc)
        return None


async def require_user(
    request: Request, credentials: HTTPAuthorizationCredentials | None = Depends(bearer)
) -> dict:
    """Dependency for dashboard endpoints. Returns the authenticated user."""
    settings = get_settings()
    if not settings.supabase_configured:
        # Dev mode: no Supabase project yet, keep local flow open.
        request.state.user = {"sub": "dev", "email": "dev@localhost"}
        return request.state.user
    token = credentials.credentials if credentials else request.headers.get("x-autotester-token", "")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = None
    if settings.supabase_jwt_secret:
        user = _verify_with_secret(token)
    if user is None:
        user = _verify_with_supabase(token)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    request.state.user = user
    return user
