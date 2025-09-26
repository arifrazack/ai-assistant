const { OAuth2Client } = require('google-auth-library');

class GoogleAuthManager {
  constructor(clientId, clientSecret, redirectUri) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  getClient() {
    return new OAuth2Client(this.clientId, this.clientSecret, this.redirectUri);
  }

  generateAuthUrl(scopes) {
    const client = this.getClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      include_granted_scopes: true
    });
  }

  async exchangeCodeForToken(code) {
    const client = this.getClient();
    const { tokens } = await client.getToken(code);
    return tokens;
  }

  setCredentials(client, tokens) {
    client.setCredentials(tokens);
  }

  async refreshAccessToken(tokens) {
    const client = this.getClient();
    client.setCredentials(tokens);
    const { credentials } = await client.refreshAccessToken();
    return credentials;
  }

  async getValidClient(tokens) {
    const client = this.getClient();
    client.setCredentials(tokens);

    // Check if token is expired and refresh if necessary
    if (tokens.expiry_date && tokens.expiry_date <= Date.now()) {
      console.log('🔄 Refreshing expired Google token...');
      try {
        const newTokens = await this.refreshAccessToken(tokens);
        client.setCredentials(newTokens);
        
        // Emit event for token update
        client.emit('tokens', newTokens);
      } catch (error) {
        console.error('❌ Failed to refresh Google token:', error);
        throw new Error('Failed to refresh Google authentication. Please re-authenticate.');
      }
    }

    client.on('tokens', (newTokens) => {
      // Handle token updates — e.g., store to DB
      console.log('🔄 New Google tokens received:', { 
        hasAccessToken: !!newTokens.access_token,
        hasRefreshToken: !!newTokens.refresh_token,
        expiryDate: newTokens.expiry_date 
      });
    });

    return client;
  }

  async getUserInfo(client) {
    const response = await client.request({
      url: 'https://www.googleapis.com/oauth2/v2/userinfo'
    });
    
    return response.data;
  }

  async verifyIdToken(idToken) {
    const client = this.getClient();
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: this.clientId
    });
    
    return ticket.getPayload();
  }

  async revokeToken(tokens) {
    const client = this.getClient();
    client.setCredentials(tokens);
    
    if (tokens.access_token) {
      await client.revokeToken(tokens.access_token);
      console.log('✅ Google token revoked successfully');
    }
  }

  // Helper method to get required scopes for Gmail
  static getGmailScopes() {
    return [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];
  }

  // Helper method to get comprehensive Google services scopes
  static getFullGoogleScopes() {
    return [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];
  }

  // Helper method to get basic profile scopes
  static getProfileScopes() {
    return [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];
  }
}

module.exports = { GoogleAuthManager }; 