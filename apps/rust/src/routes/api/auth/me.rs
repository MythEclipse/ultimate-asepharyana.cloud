//! Handler for get current user endpoint.
#![allow(dead_code)]

use axum::{
    extract::State,
    http::HeaderMap,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use std::sync::Arc;
use utoipa::ToSchema;

use crate::models::user::{User, UserResponse};
use crate::routes::AppState;
use crate::utils::auth::decode_jwt;
use crate::utils::error::AppError;

pub const ENDPOINT_METHOD: &str = "get";
pub const ENDPOINT_PATH: &str = "/api/auth/me";
pub const ENDPOINT_DESCRIPTION: &str = "Get current authenticated user";
pub const ENDPOINT_TAG: &str = "auth";
pub const OPERATION_ID: &str = "auth_me";
pub const SUCCESS_RESPONSE_BODY: &str = "Json<UserResponse>";

/// Extract Bearer token from Authorization header
fn extract_token(headers: &HeaderMap) -> Result<String, AppError> {
    let auth_header = headers
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    if !auth_header.starts_with("Bearer ") {
        return Err(AppError::Unauthorized);
    }

    Ok(auth_header[7..].to_string())
}

#[utoipa::path(
    get,
    path = "/api/auth/me",
    tag = "auth",
    operation_id = "auth_me",
    responses(
        (status = 200, description = "Get current authenticated user", body = UserResponse),
        (status = 500, description = "Internal Server Error", body = String)
    )
)]
pub async fn get_me(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<impl IntoResponse, AppError> {
    // Extract and decode JWT token
    let token = extract_token(&headers)?;
    let claims = decode_jwt(&token)?;

    // Check if token is blacklisted in Redis
    let mut redis_conn = state.redis_pool.get().await?;
    let blacklist_key = format!("blacklist:token:{}", token);
    let is_blacklisted: bool = redis::cmd("EXISTS")
        .arg(&blacklist_key)
        .query_async(&mut *redis_conn)
        .await
        .unwrap_or(false);

    if is_blacklisted {
        return Err(AppError::InvalidToken);
    }

    // Fetch user from database
    let user: User = sqlx::query_as(
        r#"
        SELECT id, email, username, password_hash, full_name, avatar_url,
               email_verified, is_active, role, last_login_at, created_at, updated_at
        FROM users
        WHERE id = ? AND is_active = TRUE
        "#,
    )
    .bind(&claims.user_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::UserNotFound)?;

    Ok(Json(UserResponse::from(user)))
}

pub fn register_routes(router: Router<Arc<AppState>>) -> Router<Arc<AppState>> {
    router.route(ENDPOINT_PATH, get(get_me))
}