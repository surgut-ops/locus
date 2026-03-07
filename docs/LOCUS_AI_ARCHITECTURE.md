# LOCUS AI Architecture

## Overview

AI capabilities are implemented in two backend modules:

- `apps/api/src/modules/ai` - core AI behavior, recommendations, ranking, embeddings, AI-assisted search
- `apps/api/src/modules/ai-advanced` - pricing intelligence, valuation, market analytics, demand forecasting

Additionally, API personalization is exposed through:

- `apps/api/src/modules/recommendations` - recommendation feed, user activity tracking (`VIEW | SEARCH | BOOK`), Redis-cached personalized results and fallback feeds.

Both modules are exposed via Fastify routes and leverage Redis caching and behavior signals.

## AI Systems

### Recommendations

- Service: `ai.recommendation.service.ts`
- Purpose:
  - personalized listing recommendations
  - trending listing retrieval
- Inputs:
  - recent views
  - favorites
  - bookings
  - search history
- Caching:
  - recommendation payloads cached in Redis (short TTL)

### Search Ranking

- Service: `ai.ranking.service.ts`
- Purpose:
  - rank candidate listings by relevance, rating, popularity, personalization
- Integrated with:
  - AI-assisted search endpoint in `ai.service.ts`

### AI-Assisted Search

- Endpoint: `POST /ai/search`
- Purpose:
  - parse natural-language intent into structured filters
  - fallback to heuristic parsing if AI extraction fails
- Data path:
  - prompt -> filter extraction -> standard listing query -> ranking service

### Embeddings

- Service: `ai.embedding.service.ts`
- Purpose:
  - prepare vector embeddings for listings (title + description)
  - supports future semantic search capabilities

### Dynamic Pricing

- Service: `ai-advanced/pricing-ai.service.ts`
- Function:
  - `calculateOptimalPrice(listingId)`
- Signals used:
  - listing attributes (location, size, rating)
  - market average price (city/district/similar type)
  - booking occupancy trend
  - listing demand score (views + city booking activity)

### Market Comparison

- Service: `ai-advanced/pricing-ai.service.ts`
- Function:
  - `compareMarketPrices(listing)`
- Output:
  - `UNDERPRICED | MARKET_PRICE | OVERPRICED`

### Property Valuation

- Service: `ai-advanced/valuation-ai.service.ts`
- Function:
  - `estimatePropertyValue(...)`
- Output:
  - estimated property value
  - confidence score
  - monthly income potential

### Market Analytics

- Service: `ai-advanced/market-ai.service.ts`
- Functions:
  - `getCityMarketStats(city)`
  - `getDistrictStats(city, district)`
  - `getMarketHeatmap(city?)`
- Output:
  - average price
  - average occupancy
  - top amenities
  - demand index / district demand intensity

### Demand Forecasting

- Service: `ai-advanced/forecast-ai.service.ts`
- Function:
  - `predictDemand(listingId)`
- Output:
  - expected bookings
  - peak seasons
  - low demand periods
  - demand score

## AI API Surface

Core AI routes:

- `POST /events/view`
- `POST /events/search`
- `GET /ai/recommendations`
- `POST /ai/search`
- `GET /ai/trending`
- `GET /recommendations`

Advanced AI routes:

- `GET /ai/host-insights/:listingId`
- `GET /ai/investment-analysis`
- `GET /ai/market-heatmap`

## Data Sources Used by AI

AI calculations rely on:

- search events (`search_performed`, tracked in Redis)
- listing views
- booking history and booking counts
- review/rating signals
- listing metadata (city, district, type, amenities, area, rooms)
- payment/revenue signals for higher-level growth metrics

## Caching Strategy

Redis-backed caching is used for expensive AI outputs:

- recommendations
- advanced host insights
- investment analysis
- market heatmap snapshots

Cache-first reads reduce repeated heavy computations and improve API latency.

## Safety and Fallbacks

- AI parsing failures in search gracefully fallback to heuristic filters.
- Most services support Redis-unavailable fallback behavior (reduced quality, but available).
- Access control is enforced at route level for host-specific insights.
