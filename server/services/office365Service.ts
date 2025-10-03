// server/services/office365Service.ts
import 'isomorphic-fetch';
import { ConfidentialClientApplication, Configuration, AuthorizationUrlRequest, AuthorizationCodeRequest, ClientCredentialRequest, AccountInfo } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';

export type OAuthToken = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // epoch ms
};

export type UserContext = {
  // Your app's user id; use this to persist tokens per user
  userId: string;
};

const {
  O365_CLIENT_ID,
  O365_CLIENT_SECRET,
  O365_TENANT_ID,
  O365_REDIRECT_URI,
  O365_SCOPES, // optional: space- or comma-separated
  NODE_ENV,
} = process.env;

if (!O365_CLIENT_ID || !O365_CLIENT_SECRET || !O365_TENANT_ID || !O365_REDIRECT_URI) {
  throw new Error('Missing required O365 env vars: O365_CLIENT_ID, O365_CLIENT_SECRET, O365_TENANT_ID, O365_REDIRECT_URI');
}

const DEFAULT_SCOPES = (O365_SCOPES ?? 'offline_access openid profile User.Read Mail.Read Calendars.Read')
  .split(/[,\s]+/)
  .filter(Boolean);

const msalConfig: Configuration = {
  auth: {
    clientId: O365_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${O365_TENANT_ID}`,
    clientSecret: O365_CLIENT_SECRET,
  },
  system: {
    loggerOptions: {
      loggerCallback(_level, message) {
        if (NODE_ENV !== 'production') console.log('[MSAL]', message);
      },
      piiLoggingEnabled: false,
    },
  },
};

// NOTE: This service is intentionally stateless. Plug in your own storage where indicated.
class Office365Service {
  private cca = new ConfidentialClientApplication(msalConfig);

  /** =======  AUTH (Authorization Code, per-user)  ======= */

  getAuthUrl(params: { userId: string; state?: string; prompt?: 'login' | 'select_account' }) {
    const authReq: AuthorizationUrlRequest = {
      scopes: DEFAULT_SCOPES,
      redirectUri: O365_REDIRECT_URI!,
      state: params.state ?? params.userId,
      prompt: params.prompt,
    };
    return this.cca.getAuthCodeUrl(authReq);
  }

  /** Exchange auth code for tokens. Persist refreshToken against your user. */
  async exchangeCodeForToken(code: string, state?: string): Promise<OAuthToken> {
    const tokenReq: AuthorizationCodeRequest = {
      code,
      scopes: DEFAULT_SCOPES,
      redirectUri: O365_REDIRECT_URI!,
    };
    const result = await this.cca.acquireTokenByCode(tokenReq);
    if (!result?.accessToken) throw new Error('No access token from Microsoft.');

    // TODO: persist refresh token securely per userId (available on result.refreshToken)
    // e.g., await saveUserRefreshToken({ userId: state, refreshToken: result.refreshToken })

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken ?? undefined,
      expiresAt: Date.now() + (result.expiresIn ?? 0) * 1000,
    };
  }

  /** Given a stored refresh token, get a fresh access token & Graph client for that user. */
  async getUserGraphClient(refreshToken: string): Promise<Client> {
    // Acquire silently by refresh token
    const result = await this.cca.acquireTokenByRefreshToken({
      refreshToken,
      scopes: DEFAULT_SCOPES,
    });

    if (!result?.accessToken) throw new Error('Failed to refresh user access token.');

    return Client.init({
      authProvider: (done) => done(null, result.accessToken),
    });
  }

  /** =======  APP-ONLY (client credentials)  ======= */

  /** For background jobs using application permissions. */
  async getAppGraphClient(scopes: string[] = ['https://graph.microsoft.com/.default']): Promise<Client> {
    const req: ClientCredentialRequest = { scopes };
    const result = await this.cca.acquireTokenByClientCredential(req);
    if (!result?.accessToken) throw new Error('Failed to get app access token.');

    return Client.init({
      authProvider: (done) => done(null, result.accessToken),
    });
  }

  /** =======  Convenience helpers (delegated)  ======= */

  async getMe(refreshToken: string) {
    const graph = await this.getUserGraphClient(refreshToken);
    return graph.api('/me').get();
  }

  async listMessages(refreshToken: string, top = 10) {
    const graph = await this.getUserGraphClient(refreshToken);
    return graph.api('/me/messages').top(top).orderby('receivedDateTime DESC').get();
  }

  async listEvents(refreshToken: string, top = 10) {
    const graph = await this.getUserGraphClient(refreshToken);
    return graph.api('/me/events').top(top).orderby('start/dateTime DESC').get();
  }

  async listContacts(refreshToken: string, top = 25) {
    const graph = await this.getUserGraphClient(refreshToken);
    return graph.api('/me/contacts').top(top).get();
  }

  /** =======  Token store hooks (implement in your app)  ======= */
  // Example signatures you can implement elsewhere and call from routes:
  // async saveUserRefreshToken(userId: string, refreshToken: string) { ... }
  // async getUserRefreshToken(userId: string): Promise<string | null> { ... }
}

const office365Service = new Office365Service();
export default office365Service;
