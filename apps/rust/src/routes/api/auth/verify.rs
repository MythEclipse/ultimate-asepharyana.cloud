//! Handler for the verify email endpoint.
#![allow(dead_code)]

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::sync::Arc;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::routes::AppState;
use crate::utils::email::EmailService;
use crate::utils::error::AppError;

pub const ENDPOINT_METHOD: &str = "get";
pub const ENDPOINT_PATH: &str = "/api/auth/verify";
pub const ENDPOINT_DESCRIPTION: &str = "Verify user email address";
pub const ENDPOINT_TAG: &str = "auth";
pub const OPERATION_ID: &str = "auth_verify";
pub const SUCCESS_RESPONSE_BODY: &str = "Json<VerifyResponse>";

/// Verify email query parameters
#[derive(Debug, Deserialize, ToSchema)]
pub struct VerifyQuery {
    /// Email verification token
    pub token: String,
}

/// Verify email response
#[derive(Debug, Serialize, ToSchema)]
pub struct VerifyResponse {
    pub success: bool,
    pub message: String,
}

/// Resend verification email request
#[derive(Debug, Deserialize, ToSchema)]
pub struct ResendVerificationRequest {
    pub email: String,
}

#[utoipa::path(
    get,
    path = "/api/auth/verify",
    tag = "auth",
    operation_id = "auth_verify",
    params(
        ("token" = String, Query, description = "Email verification token")
    ),
    responses(
        (status = 200, description = "Email verified successfully", body = VerifyResponse),
        (status = 400, description = "Bad Request - Invalid or expired token", body = String),
        (status = 404, description = "Token not found", body = String),
        (status = 500, description = "Internal Server Error", body = String)
    )
)]
pub async fn verify(
    State(state): State<Arc<AppState>>,
    Query(query): Query<VerifyQuery>,
) -> Result<impl IntoResponse, AppError> {
    // Find verification token
    let token_data: Option<(String, String, chrono::DateTime<Utc>)> = sqlx::query_as(
        r#"
        SELECT id, user_id, expires_at
        FROM email_verification_tokens
        WHERE token = ?
        "#,
    )
    .bind(&query.token)
    .fetch_optional(&state.db)
    .await?;

    let (token_id, user_id, expires_at) = token_data.ok_or(AppError::InvalidToken)?;

    // Check if token is expired
    if expires_at < Utc::now() {
        return Err(AppError::TokenExpired);
    }

    // Check if user is already verified
    let already_verified: bool = sqlx::query_scalar(
        "SELECT email_verified FROM users WHERE id = ?"
    )
    .bind(&user_id)
    .fetch_one(&state.db)
    .await?;

    if already_verified {
        return Ok((
            StatusCode::OK,
            Json(VerifyResponse {
                success: true,
                message: "Email already verified".to_string(),
            }),
        ));
    }

    // Update user's email_verified status
    sqlx::query("UPDATE users SET email_verified = TRUE, updated_at = ? WHERE id = ?")
        .bind(Utc::now())
        .bind(&user_id)
        .execute(&state.db)
        .await?;

    // Delete used verification token
    sqlx::query("DELETE FROM email_verification_tokens WHERE id = ?")
        .bind(&token_id)
        .execute(&state.db)
        .await?;

    // Get user info for welcome email
    let user_info: Option<(String, String)> = sqlx::query_as(
        "SELECT email, COALESCE(full_name, username) as name FROM users WHERE id = ?"
    )
    .bind(&user_id)
    .fetch_optional(&state.db)
    .await?;

    // Send welcome email
    if let Some((email, name)) = user_info {
        let email_service = EmailService::new();
        if let Err(e) = email_service.send_welcome_email(&email, &name).await {
            tracing::warn!("Failed to send welcome email: {}", e);
        }
    }

    Ok((
        StatusCode::OK,
        Json(VerifyResponse {
            success: true,
            message: "Email verified successfully".to_string(),
        }),
    ))
}

/// Resend verification email
#[utoipa::path(
    post,
    path = "/api/auth/verify/resend",
    tag = "auth",
    operation_id = "auth_verify_resend",
    request_body = ResendVerificationRequest,
    responses(
        (status = 200, description = "Verification email sent", body = VerifyResponse),
        (status = 400, description = "Email already verified", body = String),
        (status = 404, description = "User not found", body = String),
        (status = 500, description = "Internal Server Error", body = String)
    )
)]
pub async fn resend_verification(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ResendVerificationRequest>,
) -> Result<impl IntoResponse, AppError> {
    // Find user by email
    let user_data: Option<(String, bool)> = sqlx::query_as(
        "SELECT id, email_verified FROM users WHERE email = ?"
    )
    .bind(&payload.email)
    .fetch_optional(&state.db)
    .await?;

    let (user_id, email_verified) = user_data.ok_or(AppError::UserNotFound)?;

    // Check if already verified
    if email_verified {
        return Err(AppError::Other("Email already verified".to_string()));
    }

    // Delete old verification tokens for this user
    sqlx::query("DELETE FROM email_verification_tokens WHERE user_id = ?")
        .bind(&user_id)
        .execute(&state.db)
        .await?;

    // Generate new verification token
    let verification_token = Uuid::new_v4().to_string();
    let expires_at = Utc::now() + chrono::Duration::hours(24);

    sqlx::query(
        r#"
        INSERT INTO email_verification_tokens (id, user_id, token, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)
        "#,
    )
    .bind(Uuid::new_v4().to_string())
    .bind(&user_id)
    .bind(&verification_token)
    .bind(expires_at)
    .bind(Utc::now())
    .execute(&state.db)
    .await?;

    // Get user info for email
    let user_name: Option<String> = sqlx::query_scalar(
        "SELECT COALESCE(full_name, username) FROM users WHERE id = ?"
    )
    .bind(&user_id)
    .fetch_optional(&state.db)
    .await?;

    // Send verification email
    let email_service = EmailService::new();
    let name = user_name.as_deref().unwrap_or("User");
    if let Err(e) = email_service
        .send_verification_email(&payload.email, name, &verification_token)
        .await
    {
        tracing::warn!("Failed to send verification email: {}", e);
    }

    Ok((
        StatusCode::OK,
        Json(VerifyResponse {
            success: true,
            message: format!("Verification email sent to {}", payload.email),
        }),
    ))
}

pub fn register_routes(router: Router<Arc<AppState>>) -> Router<Arc<AppState>> {
    router
        .route(ENDPOINT_PATH, get(verify))
        .route("/api/auth/verify/resend", post(resend_verification))
}
