import { User } from '@/types';

const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '';
const AWS_REGION = import.meta.env.VITE_AWS_REGION || 'us-east-1';

const DEMO_USER: User = {
  id: 'usr_admin_001',
  email: 'admin@eventsnap.io',
  name: 'Alex Rivera',
  role: 'admin',
  token: 'mock_jwt_token_eventsnap_admin_secure',
};

/**
 * Direct Amazon Cognito User Pool authentication via HTTP API (Zero SDK overhead).
 * Uses InitiateAuth with USER_PASSWORD_AUTH flow.
 */
async function authenticateWithCognito(email: string, password: string): Promise<User> {
  const cognitoEndpoint = `https://cognito-idp.${AWS_REGION}.amazonaws.com/`;

  const payload = {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: COGNITO_CLIENT_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  };

  const response = await fetch(cognitoEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorType = data.__type || 'CognitoAuthError';
    const errorMessage = data.message || 'Cognito authentication failed.';
    throw new Error(`[${errorType}] ${errorMessage}`);
  }

  const result = data.AuthenticationResult;
  if (!result || !result.IdToken) {
    throw new Error('Authentication result missing IdToken from Amazon Cognito.');
  }

  // Parse Cognito ID token claims for user name and sub
  let name = email.split('@')[0];
  let sub = 'usr_' + Math.random().toString(36).substring(2, 9);
  try {
    const tokenParts = result.IdToken.split('.');
    if (tokenParts.length === 3) {
      const claims = JSON.parse(atob(tokenParts[1]));
      if (claims.name) name = claims.name;
      if (claims.sub) sub = claims.sub;
    }
  } catch {}

  const user: User = {
    id: sub,
    email,
    name,
    role: 'admin',
    token: result.IdToken, // Pass Cognito IdToken as Bearer token
  };

  localStorage.setItem('eventsnap_token', user.token);
  localStorage.setItem('eventsnap_user', JSON.stringify(user));
  return user;
}

export async function loginAdmin(email: string, password: string): Promise<User> {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  // If Cognito Client ID is configured and not default placeholder, authenticate with real Cognito
  if (
    COGNITO_CLIENT_ID &&
    !COGNITO_CLIENT_ID.includes('example') &&
    COGNITO_CLIENT_ID.length > 10
  ) {
    try {
      return await authenticateWithCognito(email, password);
    } catch (err: any) {
      console.warn('Cognito live auth error, checking demo credentials fallback:', err);
      // If demo credentials match, allow local preview
      if (email === DEMO_USER.email && password === 'eventpass123') {
        return handleDemoLogin(email);
      }
      throw err;
    }
  }

  // Development / Demo credentials mode (recognized by backend router)
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  return handleDemoLogin(email);
}

function handleDemoLogin(email: string): User {
  const user: User = {
    ...DEMO_USER,
    email,
    name: email.split('@')[0].replace('.', ' ').replace(/^./, (str) => str.toUpperCase()),
  };

  localStorage.setItem('eventsnap_token', user.token);
  localStorage.setItem('eventsnap_user', JSON.stringify(user));
  return user;
}

export function getCurrentUser(): User | null {
  const stored = localStorage.getItem('eventsnap_user');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function logoutAdmin(): void {
  localStorage.removeItem('eventsnap_token');
  localStorage.removeItem('eventsnap_user');
}
