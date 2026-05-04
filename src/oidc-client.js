// OIDC Client

class OIDCClient {
  constructor(config = {}) {
    this.issuerUrl = config.issuerUrl || process.env.OIDC_ISSUER_URL || "";
    this.clientId = config.clientId || process.env.OIDC_CLIENT_ID || "";
    this.clientSecret = config.clientSecret || process.env.OIDC_CLIENT_SECRET || "";
    this.redirectUri = config.redirectUri || process.env.OIDC_REDIRECT_URI || "";

    if (!this.issuerUrl || !this.clientId || !this.redirectUri) {
      throw new Error("Missing required OIDC configuration (Issuer, Client ID, or Redirect URI)");
    }
  }

  // Get auth URL
  getAuthorizationUrl(state, scopes = ["openid", "profile", "email"]) {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes.join(" "),
      state: state,
    });
    return `${this.issuerUrl}/authorize?${params.toString()}`;
  }

  // Exchange code
  async exchangeCodeForToken(code) {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: this.redirectUri,
    });

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    if (this.clientSecret) {
      const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
      headers["Authorization"] = `Basic ${basicAuth}`;
    }

    const response = await fetch(`${this.issuerUrl}/token`, {
      method: "POST",
      headers,
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`Failed to exchange code: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    return response.json();
  }

  // Fetch user info
  async getUserInfo(accessToken) {
    const response = await fetch(`${this.issuerUrl}/userinfo`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`Failed to fetch user info: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    return response.json();
  }
}

export { OIDCClient };
