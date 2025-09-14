// Ensure lazy_static macro is available
use axum::{ response::IntoResponse, routing::get, Json, Router };
use std::sync::Arc;
use crate::routes::AppState;
use serde::{ Deserialize, Serialize };
use utoipa::ToSchema;
use scraper::{ Html, Selector };
use rust_lib::fetch_with_proxy::fetch_with_proxy;
use tokio::sync::Mutex as TokioMutex;
use axum::extract::State;
use tokio::task;
use backoff::{ future::retry, ExponentialBackoff };
use std::time::{ Duration, Instant };
use dashmap::DashMap;
use tracing::{ info, warn };


lazy_static! {
  pub static ref VENZ_SELECTOR: Selector = Selector::parse(".venz ul li").unwrap();
  pub static ref TITLE_SELECTOR: Selector = Selector::parse(".thumbz h2.jdlflm").unwrap();
  pub static ref LINK_SELECTOR: Selector = Selector::parse("a").unwrap();
  pub static ref IMG_SELECTOR: Selector = Selector::parse("img").unwrap();
  pub static ref EPISODE_SELECTOR: Selector = Selector::parse(".epz").unwrap();
  pub static ref HTML_CACHE: DashMap<String, (String, Instant)> = DashMap::new();
}

#[allow(dead_code)]
pub const ENDPOINT_METHOD: &str = "get";
#[allow(dead_code)]
pub const ENDPOINT_PATH: &str = "/api/anime";
#[allow(dead_code)]
pub const ENDPOINT_DESCRIPTION: &str = "Handles GET requests for the anime endpoint.";
#[allow(dead_code)]
pub const ENDPOINT_TAG: &str = "anime";
#[allow(dead_code)]
pub const OPERATION_ID: &str = "anime_index";
#[allow(dead_code)]
pub const SUCCESS_RESPONSE_BODY: &str = "Json<AnimeResponse>";

#[derive(Serialize, Deserialize, ToSchema, Debug, Clone)]
pub struct OngoingAnimeItem {
  pub title: String,
  pub slug: String,
  pub poster: String,
  pub current_episode: String,
  pub anime_url: String,
}

#[derive(Serialize, Deserialize, ToSchema, Debug, Clone)]
pub struct CompleteAnimeItem {
  pub title: String,
  pub slug: String,
  pub poster: String,
  pub episode_count: String,
  pub anime_url: String,
}

#[derive(Serialize, Deserialize, ToSchema, Debug, Clone)]
pub struct AnimeData {
  pub ongoing_anime: Vec<OngoingAnimeItem>,
  pub complete_anime: Vec<CompleteAnimeItem>,
}

#[derive(Serialize, Deserialize, ToSchema, Debug, Clone)]
pub struct AnimeResponse {
  pub status: String,
  pub data: AnimeData,
}

#[utoipa::path(
    get,
    path = "/api/anime",
    tag = "anime",
    operation_id = "anime_index",
    responses(
        (status = 200, description = "Handles GET requests for the anime endpoint.", body = AnimeResponse),
        (status = 500, description = "Internal Server Error", body = String)
    )
)]
pub async fn anime(State(_app_state): State<Arc<AppState>>) -> impl IntoResponse {
  match fetch_anime_data(&Arc::new(TokioMutex::new(()))).await {
    Ok(data) =>
      Json(AnimeResponse {
        status: "Ok".to_string(),
        data,
      }),
    Err(_) =>
      Json(AnimeResponse {
        status: "Error".to_string(),
        data: AnimeData {
          ongoing_anime: vec![],
          complete_anime: vec![],
        },
      }),
  }
}

const CACHE_TTL: Duration = Duration::from_secs(300); // 5 minutes

async fn fetch_anime_data(
  browser: &Arc<TokioMutex<()>>
) -> Result<AnimeData, Box<dyn std::error::Error + Send + Sync>> {
  let ongoing_url = "https://otakudesu.cloud/ongoing-anime/";
  let complete_url = "https://otakudesu.cloud/complete-anime/";

  let (ongoing_html, complete_html) = tokio::join!(
    fetch_html_with_retry(browser, ongoing_url),
    fetch_html_with_retry(browser, complete_url)
  );

  let ongoing_html = ongoing_html?;
  let complete_html = complete_html?;

  let ongoing_anime = task::spawn_blocking(move || parse_ongoing_anime(&ongoing_html)).await??;
  let complete_anime = task::spawn_blocking(move || parse_complete_anime(&complete_html)).await??;

  Ok(AnimeData {
    ongoing_anime,
    complete_anime,
  })
}

async fn fetch_html_with_retry(
  browser: &Arc<TokioMutex<()>>,
  url: &str
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
  if let Some(entry) = HTML_CACHE.get(url) {
    if entry.1.elapsed() < CACHE_TTL {
      info!("Cache hit for URL: {}", url);
      return Ok(entry.0.clone());
    } else {
      HTML_CACHE.remove(url);
    }
  }

  let backoff = ExponentialBackoff {
    initial_interval: Duration::from_millis(500),
    max_interval: Duration::from_secs(10),
    multiplier: 2.0,
    max_elapsed_time: Some(Duration::from_secs(30)),
    ..Default::default()
  };

  let fetch_operation = || async {
    info!("Fetching URL: {}", url);
    match fetch_with_proxy(url, browser).await {
      Ok(response) => {
        info!("Successfully fetched URL: {}", url);
        Ok(response.data)
      }
      Err(e) => {
        warn!("Failed to fetch URL: {}, error: {:?}", url, e);
        Err(backoff::Error::transient(e))
      }
    }
  };

  let html = retry(backoff, fetch_operation).await?;
  HTML_CACHE.insert(url.to_string(), (html.clone(), Instant::now()));
  Ok(html)
}

fn parse_ongoing_anime(
  html: &str
) -> Result<Vec<OngoingAnimeItem>, Box<dyn std::error::Error + Send + Sync>> {
  let document = Html::parse_document(html);
  let mut ongoing_anime = Vec::new();

  for element in document.select(&VENZ_SELECTOR) {
    let title = element
      .select(&TITLE_SELECTOR)
      .next()
      .map(|e| e.text().collect::<String>().trim().to_string())
      .unwrap_or_default();

    let slug = element
      .select(&LINK_SELECTOR)
      .next()
      .and_then(|e| e.value().attr("href"))
      .and_then(|href| href.split('/').nth(4))
      .unwrap_or("")
      .to_string();

    let poster = element
      .select(&IMG_SELECTOR)
      .next()
      .and_then(|e| e.value().attr("src"))
      .unwrap_or("")
      .to_string();

    let current_episode = element
      .select(&EPISODE_SELECTOR)
      .next()
      .map(|e| e.text().collect::<String>().trim().to_string())
      .unwrap_or_else(|| "N/A".to_string());

    let anime_url = element
      .select(&LINK_SELECTOR)
      .next()
      .and_then(|e| e.value().attr("href"))
      .unwrap_or("")
      .to_string();

    if !title.is_empty() {
      ongoing_anime.push(OngoingAnimeItem {
        title,
        slug,
        poster,
        current_episode,
        anime_url,
      });
    }
  }
  Ok(ongoing_anime)
}

fn parse_complete_anime(
  html: &str
) -> Result<Vec<CompleteAnimeItem>, Box<dyn std::error::Error + Send + Sync>> {
  let document = Html::parse_document(html);
  let mut complete_anime = Vec::new();

  for element in document.select(&VENZ_SELECTOR) {
    let title = element
      .select(&TITLE_SELECTOR)
      .next()
      .map(|e| e.text().collect::<String>().trim().to_string())
      .unwrap_or_default();

    let slug = element
      .select(&LINK_SELECTOR)
      .next()
      .and_then(|e| e.value().attr("href"))
      .and_then(|href| href.split('/').nth(4))
      .unwrap_or("")
      .to_string();

    let poster = element
      .select(&IMG_SELECTOR)
      .next()
      .and_then(|e| e.value().attr("src"))
      .unwrap_or("")
      .to_string();

    let episode_count = element
      .select(&EPISODE_SELECTOR)
      .next()
      .map(|e| e.text().collect::<String>().trim().to_string())
      .unwrap_or_else(|| "N/A".to_string());

    let anime_url = element
      .select(&LINK_SELECTOR)
      .next()
      .and_then(|e| e.value().attr("href"))
      .unwrap_or("")
      .to_string();

    if !title.is_empty() {
      complete_anime.push(CompleteAnimeItem {
        title,
        slug,
        poster,
        episode_count,
        anime_url,
      });
    }
  }
  Ok(complete_anime)
}

pub fn register_routes(router: Router<Arc<AppState>>) -> Router<Arc<AppState>> {
    router.route(ENDPOINT_PATH, get(anime))
}