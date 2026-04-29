import { CognitoUserPool, AuthenticationDetails, CognitoUser } from 'amazon-cognito-identity-js';

const ENV_POOLS: Record<string, { UserPoolId: string; ClientId: string }> = {
  QC:        { UserPoolId: 'us-east-1_3N5rue0JG', ClientId: '5kou2mugm19s58urfnpt4k30ts' },
  F2:        { UserPoolId: 'us-east-1_3N5rue0JG', ClientId: '594gku1gpjc23mef154rionnr6' },
  F1:        { UserPoolId: 'us-east-1_3N5rue0JG', ClientId: '7drslfu74fbrtjq55bbmgot99e' },
  F5:        { UserPoolId: 'us-east-1_3N5rue0JG', ClientId: '3f60s5f2p1sl8n1ihdbham6j2n' },
  SANDBOX:   { UserPoolId: 'us-east-1_fnCVc5EZ1', ClientId: '3jacebnb1786m7a8ps1p51ij8o' },
  DEV:       { UserPoolId: 'us-east-1_3N5rue0JG', ClientId: '48l69o4o8rq1ur4mv2uq3mhfid' },
  MNSANDBOX: { UserPoolId: 'us-east-1_6sOaiEGSq', ClientId: '22ctqflqbgf04hn0jgeo7g4hie' },
  StdDevF1:  { UserPoolId: 'us-east-1_LQoUI3SF6', ClientId: '4lksce1ciup1au5r92fv96ltja' },
  WidhsDevF1:{ UserPoolId: 'us-east-1_EbcDrT7oC', ClientId: 'qa75hi44uaeqmacemabhp5mod' },
  WidhsF1:   { UserPoolId: 'us-east-1_03crulq2G', ClientId: '6rvbc4ktp67kiul4d6mqr0big6' },
};

let cachedToken: string | null = null;
let expiresAt = 0;

export async function fetchAccessToken(authEnv: string, username: string, password: string): Promise<string> {
  const pool = ENV_POOLS[authEnv];
  if (!pool) throw new Error(`Unknown auth env: ${authEnv}. Available: ${Object.keys(ENV_POOLS).join(', ')}`);

  const userPool = new CognitoUserPool({ UserPoolId: pool.UserPoolId, ClientId: pool.ClientId });
  const authDetails = new AuthenticationDetails({ Username: username, Password: password });
  const cognitoUser = new CognitoUser({ Username: username, Pool: userPool });

  return new Promise((resolve, reject) => {
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => resolve(session.getAccessToken().getJwtToken()),
      onFailure: (err) => reject(new Error(`Cognito auth failed: ${err.message}`)),
    });
  });
}

export async function getAccessToken(authEnv: string, username: string, password: string): Promise<string> {
  if (cachedToken && Date.now() < expiresAt) return cachedToken;
  cachedToken = await fetchAccessToken(authEnv, username, password);
  expiresAt = Date.now() + 55 * 60 * 1000;
  return cachedToken;
}

export function clearTokenCache(): void {
  cachedToken = null;
  expiresAt = 0;
}
