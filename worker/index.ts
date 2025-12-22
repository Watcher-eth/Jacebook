
  
  
  
  
  
  export default {
    async fetch(request: Request, env: any): Promise<Response> {
      const url = new URL(request.url);
      const path = url.pathname.slice(1); // Remove leading slash
  
      const cacheHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "Cache-Control": "public, max-age=31536000, immutable",
      };
  
      // Handle CORS preflight
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            ...cacheHeaders,
            "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      if (path === "health") {
        return new Response("ok", {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
  
      // Serve PDF images manifest
      if (path === "api/pdf-manifest") {
        const manifestObject = await env.R2_BUCKET.get("pdfs-as-jpegs/manifest.json");
        
        if (!manifestObject) {
          return new Response(JSON.stringify({ error: "Manifest not found" }), {
            status: 404,
            headers: {
              ...cacheHeaders,
              "Content-Type": "application/json",
            },
          });
        }
  
        return new Response(manifestObject.body, {
          headers: {
            ...cacheHeaders,
            "Content-Type": "application/json",
          },
        });
      }
  
 
  
      // Get files by keys endpoint (POST with array of keys)
      if (path === "api/files-by-keys" && request.method === "POST") {
        const body = await request.json() as { keys: string[] };
        const keys = body.keys || [];
        
        // Fetch metadata for each file in parallel
        const files: { key: string; size: number; uploaded: string }[] = [];
        
        await Promise.all(
          keys.map(async (key) => {
            const obj = await env.R2_BUCKET.head(key);
            if (obj) {
              files.push({
                key: obj.key,
                size: obj.size,
                uploaded: obj.uploaded.toISOString(),
              });
            }
          })
        );
  
        // Sort by key to maintain consistent order
        files.sort((a, b) => a.key.localeCompare(b.key));
  
        return new Response(
          JSON.stringify({
            files,
            totalReturned: files.length,
          }),
          {
            headers: {
              ...cacheHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
  
      // List all files endpoint (returns everything)
      if (path === "api/all-files") {
        const files: { key: string; size: number; uploaded: string }[] = [];
        let hasMoreInBucket = true;
        let bucketCursor: string | undefined = undefined;
  
        while (hasMoreInBucket) {
          const listOptions: any = {
            limit: 1000,
          };
          
          if (bucketCursor) {
            listOptions.cursor = bucketCursor;
          }
  
          const listed = await env.R2_BUCKET.list(listOptions);
  
          for (const obj of listed.objects) {
            if (obj.key.toLowerCase().endsWith(".pdf")) {
              files.push({
                key: obj.key,
                size: obj.size,
                uploaded: obj.uploaded.toISOString(),
              });
            }
          }
  
          hasMoreInBucket = listed.truncated;
          bucketCursor = listed.truncated ? listed.cursor : undefined;
        }
  
        return new Response(
          JSON.stringify({
            files,
            totalReturned: files.length,
          }),
          {
            headers: {
              ...cacheHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
  
      // List files endpoint (paginated)
      if (path === "api/files" || path === "files") {
        const startAfter = url.searchParams.get("cursor") || undefined;
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 1000);
        const prefix = url.searchParams.get("prefix") || "";
  
        // We need to fetch more than requested since we filter out non-PDFs
        const files: { key: string; size: number; uploaded: string }[] = [];
        let hasMoreInBucket = true;
        let bucketCursor: string | undefined = undefined;
        let isFirstRequest = true;
  
        while (files.length <= limit && hasMoreInBucket) {
          const listOptions: any = {
            prefix,
            limit: 1000,
          };
          
          if (isFirstRequest && startAfter) {
            listOptions.startAfter = startAfter;
            isFirstRequest = false;
          } else if (bucketCursor) {
            listOptions.cursor = bucketCursor;
          }
  
          const listed = await env.R2_BUCKET.list(listOptions);
  
          for (const obj of listed.objects) {
            if (obj.key.toLowerCase().endsWith(".pdf")) {
              files.push({
                key: obj.key,
                size: obj.size,
                uploaded: obj.uploaded.toISOString(),
              });
            }
          }
  
          hasMoreInBucket = listed.truncated;
          bucketCursor = listed.truncated ? listed.cursor : undefined;
        }
  
        // Trim to limit and determine if there's more
        const hasMore = files.length > limit || hasMoreInBucket;
        const returnFiles = files.slice(0, limit);
        
        // Use the last key as cursor for next request
        const nextCursor = hasMore && returnFiles.length > 0 
          ? returnFiles[returnFiles.length - 1].key 
          : null;
  
        return new Response(
          JSON.stringify({
            files: returnFiles,
            truncated: hasMore,
            cursor: nextCursor,
            totalReturned: returnFiles.length,
          }),
          {
            headers: {
              ...cacheHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
  
      const okHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "Cache-Control": "public, max-age=31536000, immutable",
      };
      
      const missHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "Cache-Control": "no-store, max-age=0",
      };
      
      // Serve file from R2
      const object = await env.R2_BUCKET.get(path);
  
    
if (!object) {
    return new Response("Not Found", { status: 404, headers: missHeaders });
  }

      function contentTypeForKey(key: string, fallback?: string) {
        const k = key.toLowerCase();
        if (k.endsWith(".jpg") || k.endsWith(".jpeg")) return "image/jpeg";
        if (k.endsWith(".png")) return "image/png";
        if (k.endsWith(".webp")) return "image/webp";
        if (k.endsWith(".gif")) return "image/gif";
        if (k.endsWith(".pdf")) return "application/pdf";
        return fallback || "application/octet-stream";
      }
      
      const headers = new Headers(okHeaders);
      headers.set("Content-Type", object.httpMetadata?.contentType || contentTypeForKey(path));
      headers.set("Content-Length", object.size.toString());
      headers.set("Content-Disposition", `inline; filename="${path.split("/").pop()}"`);
      
      
      return new Response(object.body, { headers });
    },
  };