export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method Not Allowed" }, 405);
    }

    if (env.TRIP_PASSWORD) {
      const password = request.headers.get("X-Trip-Password");
      if (password !== env.TRIP_PASSWORD) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
    }

    const body = await request.json();
    const fileName = body.fileName || "schedule.json";
    const schedule = body.schedule;

    if (!schedule || typeof schedule !== "object") {
      return jsonResponse({ error: "Missing schedule" }, 400);
    }

    const githubResponse = await fetch(`https://api.github.com/gists/${env.GIST_ID}`, {
      method: "PATCH",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "JapanTravel",
      },
      body: JSON.stringify({
        files: {
          [fileName]: {
            content: JSON.stringify(schedule, null, 2),
          },
        },
      }),
    });

    const text = await githubResponse.text();
    return new Response(text, {
      status: githubResponse.status,
      headers: {
        ...corsHeaders(),
        "Content-Type": githubResponse.headers.get("Content-Type") || "application/json",
      },
    });
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Trip-Password",
  };
}

function jsonResponse(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json",
    },
  });
}
