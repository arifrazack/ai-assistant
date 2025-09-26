import { OAuth2Client } from 'google-auth-library';

export interface GoogleTokens {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export class GoogleAuthManager {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  getClient() {
    return new OAuth2Client(this.clientId, this.clientSecret, this.redirectUri);
  }

  generateAuthUrl(scopes: string[]): string {
    const client = this.getClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      include_granted_scopes: true
    });
  }

  async exchangeCodeForToken(code: string): Promise<GoogleTokens> {
    const client = this.getClient();
    const { tokens } = await client.getToken(code);
    return tokens as GoogleTokens;
  }

  setCredentials(client: OAuth2Client, tokens: GoogleTokens) {
    client.setCredentials(tokens);
  }

  async refreshAccessToken(tokens: GoogleTokens): Promise<GoogleTokens> {
    const client = this.getClient();
    client.setCredentials(tokens);
    const { credentials } = await client.refreshAccessToken();
    return credentials as GoogleTokens;
  }

  async getValidClient(tokens: GoogleTokens): Promise<OAuth2Client> {
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

  async getUserInfo(client: OAuth2Client): Promise<GoogleUserInfo> {
    const response = await client.request({
      url: 'https://www.googleapis.com/oauth2/v2/userinfo'
    });
    
    return response.data as GoogleUserInfo;
  }

  async verifyIdToken(idToken: string): Promise<any> {
    const client = this.getClient();
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: this.clientId
    });
    
    return ticket.getPayload();
  }

  async revokeToken(tokens: GoogleTokens): Promise<void> {
    const client = this.getClient();
    client.setCredentials(tokens);
    
    if (tokens.access_token) {
      await client.revokeToken(tokens.access_token);
      console.log('✅ Google token revoked successfully');
    }
  }

  // Helper method to get required scopes for Gmail
  static getGmailScopes(): string[] {
    return [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];
  }

  // Helper method to get basic profile scopes
  static getProfileScopes(): string[] {
    return [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];
  }
} 