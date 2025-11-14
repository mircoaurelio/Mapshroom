const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "content-type,x-runway-api-key,x-runway-version",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};

const RUNWAY_BASE = "https://api.dev.runwayml.com";

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
    };
  }

  const { path, rawQuery } = event;
  const targetPath = path.replace(/^\/proxy/, "") || "/";
  const queryString = rawQuery ? `?${rawQuery}` : "";
  const url = RUNWAY_BASE + targetPath + queryString;

  const headerLookup = (name) => event.headers[name] ?? event.headers[name.toLowerCase()];
  const userKey = headerLookup("x-runway-api-key");
  if (!userKey) {
    return { statusCode: 400, headers: corsHeaders, body: "Missing Runway API key." };
  }

  try {
    let body;
    if (!["GET", "HEAD"].includes(event.httpMethod)) {
      body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;
    }

    const forwardHeaders = {};
    Object.entries(event.headers || {}).forEach(([key, value]) => {
      if (!value) {
        return;
      }
      const lowerKey = key.toLowerCase();
      if (["host", "origin", "referer", "content-length", "x-runway-api-key"].includes(lowerKey)) {
        return;
      }
      forwardHeaders[lowerKey] = value;
    });

    forwardHeaders.authorization = `Bearer ${userKey}`;
    if (!forwardHeaders["x-runway-version"]) {
      forwardHeaders["x-runway-version"] = "2024-11-06";
    }

    const response = await fetch(url, {
      method: event.httpMethod,
      headers: forwardHeaders,
      body,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return {
        statusCode: response.status,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          ...corsHeaders,
        },
        body: errorText || `Runway response ${response.status}`,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const headers = {
      ...Object.fromEntries(response.headers.entries()),
      ...corsHeaders,
    };

    return {
      statusCode: response.status,
      headers,
      body: Buffer.from(arrayBuffer).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: `Proxy error: ${err.message}`,
    };
  }
};
