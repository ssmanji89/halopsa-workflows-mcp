/**
 * Authentication module for HaloPSA API
 * Handles token acquisition, refresh, and authenticated client creation
 */
import axios, { AxiosInstance } from 'axios';
import { TokenResponse, ApiErrorResponse } from './types.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration from environment variables
const BASE_URL = process.env.HALOPSA_BASE_URL || '';
const CLIENT_ID = process.env.HALOPSA_CLIENT_ID || '';
const CLIENT_SECRET = process.env.HALOPSA_CLIENT_SECRET || '';
const TENANT = process.env.HALOPSA_TENANT || 'houstontechdev'; // Default tenant
const SCOPE = process.env.HALOPSA_SCOPE || 'all'; // Default scope to "all"

// Validate required environment variables
if (!BASE_URL || !CLIENT_ID || !CLIENT_SECRET) {
  throw new Error(
    'Missing required environment variables for HaloPSA authentication. ' +
    'Please ensure HALOPSA_BASE_URL, HALOPSA_CLIENT_ID, and HALOPSA_CLIENT_SECRET are set in your .env file.'
  );
}

// Token storage with expiration management
interface TokenData {
  accessToken: string;
  expiresAt: number;
}

let tokenData: TokenData | null = null;

/**
 * Get a valid auth token, refreshing if necessary
 * @returns Promise resolving to the access token
 */
export async function getToken(): Promise<string> {
  // Check if token exists and is not expired (with 60 second buffer)
  if (tokenData && tokenData.expiresAt > Date.now() + 60000) {
    return tokenData.accessToken;
  }

  // Token doesn't exist or is expired, get a new one
  return refreshToken();
}

/**
 * Refresh the auth token with retry mechanism
 * @returns Promise resolving to the new access token
 * @throws Error if authentication fails after retries
 */
async function refreshToken(retryCount = 3, retryDelay = 2000): Promise<string> {
  try {
    // Prepare form data for token request
    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('client_id', CLIENT_ID);
    formData.append('client_secret', CLIENT_SECRET);
    formData.append('scope', SCOPE); // Add scope parameter

    // Add tenant parameter to token URL (ensure no double //)
    const tokenUrl = `${BASE_URL.replace(/\/+$/, '')}/auth/token?tenant=${TENANT}`;
    console.error(`[DEBUG] Using token URL: ${tokenUrl}`);
    console.error(`[DEBUG] Auth parameters: client_id=${CLIENT_ID}, scope=${SCOPE}, tenant=${TENANT}`);

    // Make token request with timeout
    const response = await axios.post<TokenResponse>(
      tokenUrl,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000 // 10 second timeout for auth requests
      }
    );

    const { access_token, expires_in } = response.data;
    
    // Store token with expiration
    tokenData = {
      accessToken: access_token,
      // Apply a safety margin (90% of actual expiry)
      expiresAt: Date.now() + (expires_in * 900) // 90% of the expiry time in ms
    };
    
    // Redirect log to stderr instead of stdout
    console.error(`[INFO] Successfully obtained HaloPSA API token, expires in ${expires_in} seconds`);
    return access_token;
  } catch (error: any) {
    // Extract error details if available
    const errorResponse: ApiErrorResponse = error.response?.data || {};
    const errorMessage = errorResponse.error_description || 
                         errorResponse.message || 
                         error.message || 
                         'Unknown error';
    
    // Check if we should retry
    if (retryCount > 0) {
      console.error(`[WARN] Failed to refresh HaloPSA token: ${errorMessage}. Retrying in ${retryDelay}ms... (${retryCount} retries left)`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      // Exponential backoff for next retry
      return refreshToken(retryCount - 1, retryDelay * 1.5);
    }
    
    console.error(`[ERROR] Failed to refresh HaloPSA token after multiple attempts: ${errorMessage}`);
    throw new Error(`Authentication with HaloPSA failed: ${errorMessage}`);
  }
}

/**
 * Create an axios instance with auth token for HaloPSA API requests
 * @returns Promise resolving to an authenticated axios instance
 */
export async function createAuthenticatedClient(): Promise<AxiosInstance> {
  const token = await getToken();
  
  // Ensure API URL ends with /api
  const apiBaseUrl = BASE_URL.replace(/\/+$/, '');
  const apiUrl = apiBaseUrl.endsWith('/api') ? apiBaseUrl : `${apiBaseUrl}/api`;
  
  // Create client with enhanced configuration
  const client = axios.create({
    baseURL: apiUrl,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'HaloPSA-Workflow-MCP-Server/1.0.0' // Add user agent for better tracing
    },
    timeout: 25000, // 25 second timeout (reduced from 30)
    // Axios doesn't support maxRetries in create configuration
    // Use interceptors for retry logic instead
    validateStatus: (status) => status < 500 // Only treat 5xx as errors for retry purposes
  });
  
  console.error(`[DEBUG] API Base URL: ${apiUrl}`);
  
  // Add response interceptor to handle token refresh
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      // Check if error is due to authentication
      if (error.response && error.response.status === 401) {
        console.error('[WARN] Authentication token expired, refreshing...');
        
        try {
          // Force token refresh
          tokenData = null;
          const newToken = await getToken();
          
          // Retry the original request with new token
          const originalRequest = error.config;
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return axios(originalRequest);
        } catch (refreshError) {
          console.error('[ERROR] Failed to refresh token during request retry:', refreshError);
          return Promise.reject(error);
        }
      }
      
      // For network errors, provide better logging
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        console.error('[ERROR] Network timeout or connection error:', error.message);
      }
      
      return Promise.reject(error);
    }
  );
  
  return client;
}