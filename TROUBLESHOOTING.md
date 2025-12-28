# Plane Docker Deployment - Troubleshooting Guide

## React Errors & Frontend Issues

### React Error #418 (Hydration Mismatch)

**Error Message:**
```
Minified React error #418; visit https://reactjs.org/docs/error-decoder.html?invariant=418
```

**What it means:** Text content does not match server-rendered HTML. This is a hydration mismatch between the server-side rendered content and client-side React.

**Causes:**
1. Production build with minified code
2. Data fetching timing issues
3. Browser extensions interfering with rendering
4. Inconsistent data between server and client

**Solutions:**
1. **Clear browser cache and hard refresh** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Disable browser extensions** temporarily
3. **Check if data is loading correctly** - these errors often resolve themselves after initial load
4. **For development**, use non-minified build to see actual error messages

**Note:** These errors are often cosmetic in production builds and don't affect functionality. The app should still work correctly.

### React Error #423 (Render Loop)

**Error Message:**
```
Minified React error #423
```

**What it means:** Cannot update a component while rendering a different component (render loop detected).

**This is a known issue** in the production build and typically doesn't affect functionality. The React team is aware of these warnings in production builds.

## WebSocket Connection Failures

### Live Collaboration WebSocket Errors

**Error Message:**
```
WebSocket connection to 'ws://localhost:3005/live/collaboration' failed
```

**Cause:** The `/live/` endpoint wasn't configured in the nginx reverse proxy.

**Solution:** Already fixed in `edge.conf` with WebSocket support:
```nginx
location /live/ {
  proxy_pass http://$api_upstream:8000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_read_timeout 86400;
}
```

**To apply the fix:**
```bash
docker restart plane-plane-edge-1
```

## API 404 Errors

### Missing `/intake-state/` Endpoint

**Error Message:**
```
GET /api/workspaces/projects/projects/{id}/intake-state/ 404
```

**Cause:** This is a newer API endpoint that may not be available in all versions of Plane.

**Impact:** This is a non-critical feature. The 404 error doesn't break core functionality.

**Solution:** No action needed. This endpoint is for intake management features. If you need this feature, ensure you're running the latest version of Plane.

## Profile Picture Rendering Issues

### Profile Picture Not Displaying

**Symptoms:**
- Profile picture uploads successfully (200/204 status codes in API logs)
- But image doesn't display in the UI
- Browser shows 302 redirects to MinIO

**Cause:** The API returns a 302 redirect to MinIO storage, but the browser may have CORS or network issues following the redirect.

**Check if upload worked:**
```bash
# View API logs to confirm upload
docker logs plane-plane-api-1 --tail 50 | grep "user-assets"

# Should see:
# POST /api/assets/v2/user-assets/ 200
# PATCH /api/assets/v2/user-assets/{id}/ 204
```

**Solutions:**

1. **Verify MinIO is accessible:**
```bash
# Check MinIO health
docker ps | grep minio
# Should show "healthy"

# Test MinIO access
curl http://localhost:9000/minio/health/live
```

2. **Check MinIO console:**
- Open http://localhost:9001
- Login: minioadmin / minioadmin
- Navigate to `plane-uploads` bucket
- Verify your uploaded files are there

3. **Clear browser cache:**
- Hard refresh (Ctrl+Shift+R)
- Clear site data in browser DevTools

4. **Check CORS settings:**
The API should handle CORS, but if issues persist, check `docker-compose.yaml`:
```yaml
CORS_ALLOWED_ORIGINS: http://localhost:3005
```

### Profile Picture Shows Broken Image

**If the image shows a broken icon:**

1. **Check the asset URL in browser DevTools:**
   - Open Network tab
   - Look for requests to `/api/assets/v2/static/{id}/`
   - Check if it returns 302 redirect
   - Follow the redirect URL - should point to MinIO

2. **Verify MinIO bucket permissions:**
```bash
docker exec plane-plane-minio-1 mc anonymous get myminio/plane-uploads
# Should show: Access permission for 'myminio/plane-uploads' is 'public'
```

3. **Re-upload the image:**
   - Sometimes the first upload has timing issues
   - Delete and re-upload the profile picture

## General Debugging Commands

### Check Container Health
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### View Real-time Logs
```bash
# API logs
docker logs plane-plane-api-1 -f

# Web logs
docker logs plane-plane-web-1 -f

# Edge proxy logs
docker logs plane-plane-edge-1 -f
```

### Check Specific Errors
```bash
# Search for errors in API
docker logs plane-plane-api-1 --tail 100 | grep -i error

# Search for 404s
docker logs plane-plane-api-1 --tail 100 | grep "404"

# Search for 500s
docker logs plane-plane-api-1 --tail 100 | grep "500"
```

### Test API Endpoints
```bash
# Test instance config
curl http://localhost:3005/api/instances/ | python -m json.tool

# Test user endpoint (requires authentication)
curl http://localhost:3005/api/users/me/ -H "Cookie: sessionid=your-session-id"
```

### Restart Services
```bash
# Restart specific service
docker restart plane-plane-api-1
docker restart plane-plane-web-1
docker restart plane-plane-edge-1

# Restart all services
docker-compose restart

# Full rebuild (if configuration changed)
docker-compose down
docker-compose up -d --build
```

## Performance Issues

### Slow Page Loads

**Symptoms:** Pages take a long time to load, especially on first visit.

**Causes:**
1. Production build is optimized but larger
2. Cold start of containers
3. Database queries on first load

**Solutions:**
1. **Wait for containers to warm up** (first 30-60 seconds after start)
2. **Check container resources:**
```bash
docker stats
```
3. **Ensure Docker has enough resources** (Settings > Resources):
   - Memory: At least 4GB
   - CPU: At least 2 cores

### High Memory Usage

**Check memory usage:**
```bash
docker stats --no-stream
```

**If containers are using too much memory:**
1. Reduce worker counts in `docker-compose.yaml`:
```yaml
GUNICORN_WORKERS: 2  # Reduce from 4
```
2. Restart containers:
```bash
docker-compose restart
```

## Browser-Specific Issues

### Chrome/Edge Issues

1. **Disable extensions** that might interfere (ad blockers, privacy tools)
2. **Clear site data:**
   - DevTools > Application > Clear storage
   - Check all boxes and clear
3. **Try incognito mode** to rule out extension interference

### Firefox Issues

1. **Check Enhanced Tracking Protection** settings
2. **Disable strict mode** if enabled
3. **Clear cookies and cache** for localhost

## Production Deployment Considerations

### React Errors in Production

The minified React errors (#418, #423) are more common in production builds because:
1. Code is minified and optimized
2. Error messages are shortened
3. Some development-only checks are removed

**These are generally safe to ignore** if:
- The app functions correctly
- No user-facing issues occur
- Errors don't repeat infinitely

### Monitoring

For production deployments, consider:
1. **Error tracking** (Sentry, Rollbar)
2. **Log aggregation** (ELK stack, Loki)
3. **Performance monitoring** (New Relic, Datadog)
4. **Uptime monitoring** (UptimeRobot, Pingdom)

## Getting Help

If issues persist:

1. **Check the logs** first (see commands above)
2. **Search GitHub issues**: https://github.com/makeplane/plane/issues
3. **Join Discord community**: https://discord.com/invite/A92xrEGCge
4. **Review documentation**: https://docs.plane.so

## Summary of Known Issues

| Issue | Severity | Impact | Status |
|-------|----------|--------|--------|
| React Error #418 | Low | Cosmetic, no functional impact | Known issue in production builds |
| React Error #423 | Low | Cosmetic, no functional impact | Known issue in production builds |
| WebSocket failures | Medium | Live collaboration won't work | Fixed in edge.conf |
| 404 on /intake-state/ | Low | Missing optional feature | Not critical |
| Profile pic rendering | Medium | Images may not display initially | Workaround: refresh/re-upload |

Most issues are cosmetic or have workarounds. The core functionality of Plane works correctly.
