// Bir özellik yayını açmak için zorunlu değilse MVP’ye eklenmeyecek.

export class YouTubeChat {
  constructor({ onVote, onLatencyP95 = () => {}, log = console }) {
    this.onVote = onVote;
    this.onLatencyP95 = onLatencyP95;
    this.log = log;
    this.running = false;
    this.pageToken = null;
    this.pollMs = 2000;
    this.firstPoll = true;
    this.seenIds = new Set();
    this.latencies = [];
    this.accessToken = process.env.YOUTUBE_ACCESS_TOKEN || null;
    this.tokenExpiresAt = this.accessToken ? Date.now() + 45 * 60 * 1000 : 0;
  }

  configured() {
    const refreshConfigured = process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET && process.env.YOUTUBE_REFRESH_TOKEN;
    return Boolean(process.env.YOUTUBE_LIVE_CHAT_ID && (this.accessToken || refreshConfigured));
  }

  async token(forceRefresh = false) {
    if (!forceRefresh && this.accessToken && Date.now() < this.tokenExpiresAt) return this.accessToken;
    if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET || !process.env.YOUTUBE_REFRESH_TOKEN) return this.accessToken;
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.YOUTUBE_CLIENT_ID,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET,
        refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
        grant_type: "refresh_token",
      }),
    });
    const body = await response.json();
    if (!response.ok || !body.access_token) throw new Error(`youtube_oauth_${response.status}`);
    this.accessToken = body.access_token;
    this.tokenExpiresAt = Date.now() + Math.max(60, Number(body.expires_in || 3600) - 300) * 1000;
    return this.accessToken;
  }

  async start() {
    if (!this.configured()) {
      this.log.info("YouTube chat disabled: YOUTUBE_LIVE_CHAT_ID/YOUTUBE_ACCESS_TOKEN missing.");
      return;
    }
    this.running = true;
    while (this.running) {
      try {
        const query = new URLSearchParams({
          liveChatId: process.env.YOUTUBE_LIVE_CHAT_ID,
          part: "snippet,authorDetails",
          maxResults: "200",
        });
        if (this.pageToken) query.set("pageToken", this.pageToken);
        let response = await fetch(`https://www.googleapis.com/youtube/v3/liveChat/messages?${query}`, {
          headers: { authorization: `Bearer ${await this.token()}` },
        });
        if (response.status === 401 && process.env.YOUTUBE_REFRESH_TOKEN) {
          response = await fetch(`https://www.googleapis.com/youtube/v3/liveChat/messages?${query}`, {
            headers: { authorization: `Bearer ${await this.token(true)}` },
          });
        }
        const body = await response.json();
        if (!response.ok) throw new Error(`youtube_${response.status}`);
        this.pageToken = body.nextPageToken || this.pageToken;
        this.pollMs = Math.max(1000, body.pollingIntervalMillis || this.pollMs);
        const items = body.items || [];
        for (const item of items) {
          const alreadySeen = item?.id ? this.seenIds.has(item.id) : false;
          if (item?.id) this.seenIds.add(item.id);
          if (this.firstPoll) continue;
          if (alreadySeen) continue;
          const text = item?.snippet?.displayMessage;
          const userId = item?.authorDetails?.channelId;
          const publishedAt = Date.parse(item?.snippet?.publishedAt || "");
          if (Number.isFinite(publishedAt)) {
            this.latencies.push(Math.max(0, (Date.now() - publishedAt) / 1000));
            this.latencies = this.latencies.slice(-20);
            if (this.latencies.length === 20) {
              const sorted = [...this.latencies].sort((a, b) => a - b);
              this.onLatencyP95(sorted[Math.ceil(sorted.length * 0.95) - 1]);
            }
          }
          if (text === "1" || text === "2") this.onVote(userId, text, "youtube");
        }
        this.firstPoll = false;
      } catch (error) {
        this.log.error("YouTube chat poll failed", { code: String(error?.message || error) });
        this.pollMs = Math.max(this.pollMs, 5000);
      }
      await new Promise((resolve) => setTimeout(resolve, this.pollMs));
    }
  }

  stop() {
    this.running = false;
  }
}
