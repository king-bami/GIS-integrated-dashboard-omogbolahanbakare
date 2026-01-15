# Learning Log

**The Problem:**
During initial testing of the dispatch feature, I encountered a critical logic bug: once an ambulance was dispatched (i made the status moved from 'available' to 'busy' when any hospital is using it),so it would immediately disappear from the "Recommended Units" list and the map's proximity HUD. This created a jarring UI experience where the admin couldn't see the unit they just authorized.

**Research & Investigation:**
I first checked the frontend state management, thinking I was filtering out 'busy' units in React. However, the data itself was missing from the API response. I traced the issue back to the `findNearestAmbulance` controller. My initial SQL query was:
```sql
SELECT ... FROM ambulances WHERE status = 'available' ...
```

**The Solution:**
I realized that for a real-time command center, "Proximity" isn't just about *who can go*, but also *who is currently going*. I updated the spatial query to include units in the 'busy' state and implemented a "Recommended" badge in the UI that uses custom logic to prioritize available units while still maintaining visibility of the active unit.

```javascript
// Updated query to maintain visibility of dispatched units
const ambulanceResult = await query(`
  SELECT ... FROM ambulances a
  WHERE a.status IN ('available', 'busy')
  ORDER BY a.location <-> $1::geography
  LIMIT 5
`, [hospital.location]);
```

---

## 2. For the caching feedback
Implementing the caching layer was the most technically demanding part of the "Grit" requirement. The challenge was ensuring the application remained functional for reviewers who might not have a Redis instance running locally.

**Solution:** I implemented a **Dual-Layer Caching Engine**.
1. **Primary Layer:** Redis (via `redis-om` / standard client).
2. **Resilience Layer:** A native JavaScript `Map` with custom TTL (Time-To-Live) logic.

If the Redis connection fails, the system logs an information message and transparently switches  and fall back to the in-memory cache. So the application will still work without Redis on any machine that runs the project. This ensures the "Grit" requirement is met without sacrificing portability.

---

## 3. Initiative: Going Beyond the baseline
To demonstrate initiative, I implemented two features not explicitly requested:
*   **Real-Time Vector Streaming:** Using **Socket.io**, the dashboard reflects movements and status changes across all clients instantly. This transforms the app from a "viewer" into a "living system."


## 4. Problem-Solving Mindset
My approach focused on **Geospatial Precision**. I specifically chose PostGIS `geography` types over `geometry`. While `geometry` is easier for flat-plane math, `geography` accounts for the Earth's curvature—a critical requirement for emergency services spanning large urban areas like Lagos. This decision reflects a solution-oriented mindset that prioritizes long-term correctness over shortcuts.
