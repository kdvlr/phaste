# 0005. Single-Tenant Security Model with Reverse Proxy Forward Auth and API Tokens

We chose a single-tenant operational model for `phaste` rather than a full multi-user database architecture. Web UI access integrates natively with upstream reverse proxy forward authentication (such as Caddy Ingress OTP), while programmatic and quick-paste endpoints (CLI, iOS shortcuts, browser extensions) are authorized via bearer API tokens. Public sharing of individual pastes is enabled via unique, unguessable slugs rather than user permission matrices.
