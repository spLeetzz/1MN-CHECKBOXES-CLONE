/**
 * OIDC Client SDK (from General Auth Service)
 * Copied from: General Auth Service/sdk/oidc-client.js
 *
 * Environment variables required:
 * OIDC_ISSUER_URL="http://localhost:3000"
 * OIDC_CLIENT_ID="your-client-id"
 * OIDC_CLIENT_SECRET="your-client-secret"
 * OIDC_REDIRECT_URI="http://localhost:4000/auth/callback"
 */

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

  /**
   * Get the authorization URL to redirect the user to.
   */
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

  /**
   * Exchange the authorization code for access and ID tokens.
   */
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

  /**
   * Fetch user information using the access token.
   */
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
