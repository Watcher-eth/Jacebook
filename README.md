Jacebook

Jacebook is a Next.js + Tailwind web app that reconstructs people, relationships, and events from document appearances (PDFs), with a Facebook-style feed, profiles, and communities.

The system is intentionally read-only, deterministic, and cache-heavy, optimized for fast SSR and CDN delivery.

High-level Architecture

Documents (PDFs and JPGs in R2)
        ↓
Cloudflare Worker
        ↓
Next.js API routes (cached)
        ↓
Next.js pages (SSR + client hydration)

Key principles
	•	No database — everything derives from static celebrity data + document appearances
	•	Deterministic outputs (same input → same feed, likes, ordering)
	•	Aggressive caching at every layer (Worker, API routes, browser)
	•	Fast SSR with minimal blocking work

Repo Structure

/src/pages – Routing & API

Pages
	•	/ – Main feed
	•	/u/[slug] – Person profile (timeline / about / friends / photos)
	•	/c/[filter] – Community pages

API Routes
All API routes are pure functions + in-memory TTL cache.
	•	/api/feed/posts
→ Global feed (interleaved across authors, deterministic shuffle)
	•	/api/people/posts
→ Posts for a single person (used by profile infinite scroll)
	•	/api/people/with-people
→ Co-appearance logic (“with X, Y”)
Expensive logic → heavily cached
	•	/api/people/friends
→ Friends graph based on co-occurrence
	•	/api/people/wikidata
→ Wikidata enrichment (name, image)
	•	/api/people/c
→ Community → people mapping


/src/lib – Core Logic

Important files

celebrityData.ts
	•	Canonical dataset
	•	Contains:
	•	Names
	•	Appearances { file, page, confidence }
	•	Treated as source of truth

people.ts
	•	Slug logic
	•	Precomputed indexes
	•	Avatar selection
	•	Search helpers

⚠️ Runs at module init — keep it fast.

friendsGraph.ts
Builds the friends network:
	•	Co-appearance based
	•	Weighted edges
	•	Windowed by page distance

This is CPU-heavy, so always cached upstream.

likedBy.ts
Fake but deterministic likes:
	•	Seeded RNG
	•	Stable per post key
	•	Never random at runtime


worker-client.ts
Client for the Cloudflare Worker
	•	Builds file URLs
	•	PDF → image resolution
	•	SSR-safe fetch cache

⚠️ No direct R2 access from Next.js.

/worker – Cloudflare Worker
	•	Serves files from R2
	•	Generates thumbnails / page images
	•	Exposes:
	•	/api/files-by-keys
	•	/api/pdf-manifest

This is intentionally dumb and fast.

Components

Feed
	•	NewsFeedPost is image-heavy but optimized
	•	Thumb → HQ upgrade via IntersectionObserver
	•	No next/image on purpose (Worker URLs)

Profile
	•	Tabs are UI-only (no routing)
	•	Mobile behavior differs intentionally
	•	Wikidata loads client-side to keep SSR fast

Caching Strategy (Important)

Server
	•	In-memory TTL caches (Map)
	•	De-duped inflight requests
	•	CDN headers set on all API routes

CDN
	•	s-maxage
	•	stale-while-revalidate

Client
	•	Infinite scroll uses cursor-based pagination
	•	No refetching already seen items

⚠️ If you add new API routes, copy the caching pattern.
