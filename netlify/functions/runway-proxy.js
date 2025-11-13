const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "content-type,x-runway-api-key",
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

  const userKey = event.headers["x-runway-api-key"];
  if (!userKey) {
    return { statusCode: 400, headers: corsHeaders, body: "Missing Runway API key." };
  }

  try {
    const response = await fetch(url, {
      method: event.httpMethod,
      headers: {
        ...event.headers,
        host: undefined,
        origin: undefined,
        referer: undefined,
        authorization: `Bearer ${userKey}`,
        "x-runway-version": "2024-11-06",
        "x-runway-api-key": undefined,
        "content-length": undefined,
      },
      body: ["GET", "HEAD"].includes(event.httpMethod) ? undefined : event.body,
    });

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
