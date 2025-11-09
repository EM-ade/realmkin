# Phase 3: Advanced Optimizations Guide

**Target**: 50-60% additional improvement (cumulative 70%+ total)

---

## Overview

Phase 3 focuses on server-side optimizations, database efficiency, and comprehensive performance monitoring.

---

## 3.1 Server-Side Rendering Optimization

### Move Auth Checks to Middleware

**File**: `/src/middleware.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;

  // Check if user is authenticated
  if (!token && request.nextUrl.pathname.startsWith("/protected")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verify token
  if (token) {
    try {
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch (error) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/protected/:path*", "/api/protected/:path*"],
};
```

**Benefits**:
- Auth checks happen before page render
- Faster redirects
- Reduced client-side logic

### Pre-render Static Pages

**File**: `/src/app/page.tsx`

```typescript
export const revalidate = 3600; // Revalidate every hour (ISR)

export const metadata = {
  title: "Realmkin - The Realm",
  description: "Battle in The Void",
};

export default function HomePage() {
  // Page is pre-rendered at build time
  // Revalidated every 3600 seconds
  return (
    // ...
  );
}
```

**Benefits**:
- Instant page loads
- Reduced server load
- Better SEO

### Implement ISR (Incremental Static Regeneration)

```typescript
// Revalidate every 1 hour
export const revalidate = 3600;

// Or on-demand revalidation
export async function revalidateTag(tag: string) {
  revalidateTag(tag);
}
```

---

## 3.2 Database Query Optimization

### Add Firebase Indexes

**File**: `firestore.indexes.json`

```json
{
  "indexes": [
    {
      "collectionGroup": "users",
      "queryScope": "Collection",
      "fields": [
        { "fieldPath": "wallet", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "stakes",
      "queryScope": "Collection",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    }
  ]
}
```

**Deploy indexes**:
```bash
firebase deploy --only firestore:indexes
```

### Implement Pagination

```typescript
import { query, collection, where, orderBy, limit, startAfter } from "firebase/firestore";

const pageSize = 20;

async function getUsers(pageNumber: number) {
  const offset = pageNumber * pageSize;
  
  const q = query(
    collection(db, "users"),
    orderBy("createdAt", "desc"),
    limit(pageSize + 1),
    startAfter(offset)
  );

  return getDocs(q);
}
```

### Batch Queries

```typescript
import { writeBatch } from "firebase/firestore";

const batch = writeBatch(db);

// Add multiple operations
batch.set(doc(db, "users", "user1"), { name: "Alice" });
batch.update(doc(db, "users", "user2"), { status: "active" });
batch.delete(doc(db, "users", "user3"));

// Commit all at once
await batch.commit();
```

### Use Real-time Listeners Efficiently

```typescript
import { onSnapshot, query, collection, where } from "firebase/firestore";

let unsubscribe: (() => void) | null = null;

// Subscribe to user data
function subscribeToUser(userId: string) {
  const q = query(
    collection(db, "users"),
    where("id", "==", userId)
  );

  unsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.docs.forEach((doc) => {
      console.log("User data:", doc.data());
    });
  });
}

// Unsubscribe when done
function unsubscribeFromUser() {
  if (unsubscribe) {
    unsubscribe();
  }
}
```

---

## 3.3 Web Vitals Optimization

### Optimize LCP (Largest Contentful Paint)

```typescript
// Preload critical resources
<link rel="preload" as="image" href="/hero-image.webp" />
<link rel="preload" as="font" href="/font.woff2" type="font/woff2" />

// Lazy load non-critical images
<Image
  src="/image.webp"
  alt="Description"
  loading="lazy"
  placeholder="blur"
/>
```

### Reduce CLS (Cumulative Layout Shift)

```typescript
// Reserve space for images
<div style={{ position: "relative", width: "100%", paddingBottom: "66.67%" }}>
  <Image
    src="/image.webp"
    alt="Description"
    fill
    style={{ objectFit: "cover" }}
  />
</div>

// Use size attributes
<Image
  src="/image.webp"
  alt="Description"
  width={1200}
  height={800}
/>
```

### Improve FID (First Input Delay)

```typescript
// Break up long tasks
async function processLargeData(data: any[]) {
  for (let i = 0; i < data.length; i += 100) {
    await new Promise(resolve => setTimeout(resolve, 0));
    processChunk(data.slice(i, i + 100));
  }
}

// Use requestIdleCallback
requestIdleCallback(() => {
  // Non-critical work
  analyzeUserBehavior();
});
```

---

## 3.4 Performance Monitoring & Analytics

### Integrate Vercel Analytics

```typescript
// /src/app/layout.tsx
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### Add Sentry for Error Tracking

```bash
npm install @sentry/nextjs
```

```typescript
// /src/instrumentation.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

### Set Up Performance Budgets

```typescript
// /next.config.js
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

module.exports = withBundleAnalyzer({
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.performance = {
        maxEntrypointSize: 250000,
        maxAssetSize: 250000,
      };
    }
    return config;
  },
});
```

---

## Implementation Checklist

- [ ] Set up middleware for auth checks
- [ ] Configure ISR for static pages
- [ ] Add Firebase indexes
- [ ] Implement pagination for lists
- [ ] Batch database queries
- [ ] Optimize images for LCP
- [ ] Reserve space to reduce CLS
- [ ] Break up long tasks for FID
- [ ] Integrate Vercel Analytics
- [ ] Add Sentry error tracking
- [ ] Set up performance budgets
- [ ] Monitor real-world metrics

---

## Expected Results

| Metric | Phase 2 | Phase 3 Target | Total Improvement |
|--------|---------|----------------|------------------|
| Load Time | 1.2s | 0.6s | **83% ⬇️** |
| Bundle Size | 280KB | 180KB | **60% ⬇️** |
| LCP | 1.1s | 0.5s | **85% ⬇️** |
| CLS | 0.1 | 0.05 | **50% ⬇️** |
| FID | 50ms | 20ms | **60% ⬇️** |

---

## Monitoring & Maintenance

### Weekly Tasks
- Review Vercel Analytics dashboard
- Check error rates in Sentry
- Monitor performance budgets
- Analyze user feedback

### Monthly Tasks
- Review Core Web Vitals trends
- Identify performance regressions
- Optimize slow queries
- Update dependencies

### Quarterly Tasks
- Full performance audit
- Update optimization strategies
- Plan next improvements
- Share metrics with team

---

## Resources

- [Vercel Analytics Docs](https://vercel.com/docs/analytics)
- [Web Vitals Guide](https://web.dev/vitals/)
- [Firebase Optimization](https://firebase.google.com/docs/firestore/best-practices)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Sentry Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

---

**Last Updated**: November 9, 2025
