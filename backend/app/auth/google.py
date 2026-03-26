"""Google OAuth2 helpers."""

import os
from urllib.parse import urlencode

import httpx

_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_TOKEN_URL = "https://oauth2.googleapis.com/token"
_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


def get_oauth_url(state: str) -> str:
    params = {
        "client_id": os.environ["GOOGLE_CLIENT_ID"],
        "redirect_uri": os.environ["GOOGLE_REDIRECT_URI"],
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    return f"{_AUTH_URL}?{urlencode(params)}"


def exchange_code(code: str) -> dict:
    resp = httpx.post(_TOKEN_URL, data={
        "client_id": os.environ["GOOGLE_CLIENT_ID"],
        "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
        "redirect_uri": os.environ["GOOGLE_REDIRECT_URI"],
        "grant_type": "authorization_code",
        "code": code,
    }, timeout=10)
    resp.raise_for_status()
    return resp.json()


def fetch_user_info(access_token: str) -> dict:
    resp = httpx.get(
        _USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()
