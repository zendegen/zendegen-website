// Supabase client for web (not Chrome extension)
// Uses localStorage instead of chrome.storage

// Local storage adapter for web
const LocalStorageAdapter = {
  getItem: async (key) => {
    return localStorage.getItem(key);
  },
  setItem: async (key, value) => {
    localStorage.setItem(key, value);
  },
  removeItem: async (key) => {
    localStorage.removeItem(key);
  }
};

// Supabase configuration
const supabaseUrl = 'https://wouziwxgidiuygrxxago.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvdXppd3hnaWRpdXlncnh4YWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MzQzNDAsImV4cCI6MjA3NTExMDM0MH0.esqjsJPZ79s7E9TzAyd8tPlx8fjFtwEgsHZdBataodI';

// Simplified Supabase client class
class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
    this.auth = new SupabaseAuth(this);
  }

  async signOut() {
    try {
      await LocalStorageAdapter.removeItem('supabase.auth.token');
      await LocalStorageAdapter.removeItem('supabase.auth.refresh_token');
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  async getUser() {
    try {
      const token = await LocalStorageAdapter.getItem('supabase.auth.token');
      if (!token) {
        return { data: { user: null } };
      }

      // Decode JWT token to get user info without network call
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        // Check if token is expired
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          console.log('Token expired');
          return { data: { user: null } };
        }
        
        // Return user info from token payload
        const user = {
          id: payload.sub,
          email: payload.email,
          user_metadata: payload.user_metadata || {},
          app_metadata: payload.app_metadata || {}
        };
        
        return { data: { user } };
      } catch (decodeError) {
        console.error('Failed to decode token:', decodeError);
        return { data: { user: null } };
      }
    } catch (error) {
      console.error('getUser error:', error);
      return { data: { user: null } };
    }
  }

  // Database methods
  from(table) {
    return new SupabaseTable(this.url, this.key, null, table);
  }
}

// Supabase Table Query Builder
class SupabaseTable {
  constructor(url, key, token, table) {
    this.url = url;
    this.key = key;
    this.token = token;
    this.table = table;
    this.query = {};
  }

  select(columns = '*') {
    this.query.select = columns;
    return this;
  }

  insert(data) {
    this.query.method = 'POST';
    this.query.data = data;
    return this;
  }

  update(data) {
    this.query.method = 'PATCH';
    this.query.data = data;
    return this;
  }

  delete() {
    this.query.method = 'DELETE';
    return this;
  }

  eq(column, value) {
    if (!this.query.filters) this.query.filters = [];
    this.query.filters.push({ column, op: 'eq', value });
    return this;
  }

  order(column, options = {}) {
    this.query.order = { column, ascending: options.ascending !== false };
    return this;
  }

  limit(count) {
    this.query.limit = count;
    return this;
  }

  async execute() {
    try {
      // Fetch token if not already set (for authenticated requests)
      if (!this.token) {
        this.token = await LocalStorageAdapter.getItem('supabase.auth.token');
      }

      const headers = {
        'apikey': this.key,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      };

      // Add auth header if we have a token
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      let url = `${this.url}/rest/v1/${this.table}`;
      const method = this.query.method || 'GET';

      // Build query params for GET requests
      if (method === 'GET' && this.query.select) {
        const params = new URLSearchParams({ select: this.query.select });
        
        if (this.query.filters) {
          this.query.filters.forEach(f => {
            params.append(f.column, `${f.op}.${f.value}`);
          });
        }

        if (this.query.order) {
          params.append('order', `${this.query.order.column}.${this.query.order.ascending ? 'asc' : 'desc'}`);
        }

        if (this.query.limit) {
          params.append('limit', this.query.limit);
        }

        url += `?${params.toString()}`;
      } else if (this.query.filters) {
        // For POST/PATCH/DELETE with filters
        const params = new URLSearchParams();
        this.query.filters.forEach(f => {
          params.append(f.column, `${f.op}.${f.value}`);
        });
        url += `?${params.toString()}`;
      }

      const options = {
        method,
        headers,
        // Add timeout and other fetch options
        mode: 'cors',
        cache: 'no-cache'
      };

      if (this.query.data) {
        options.body = JSON.stringify(this.query.data);
      }

      // Add timeout wrapper (30 seconds)
      const fetchWithTimeout = (url, options, timeout = 30000) => {
        return Promise.race([
          fetch(url, options),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout - Supabase took too long to respond')), timeout)
          )
        ]);
      };

      const response = await fetchWithTimeout(url, options);
      
      if (response.ok) {
        const data = await response.json();
        return { data, error: null };
      } else {
        const error = await response.json();
        return { data: null, error };
      }
    } catch (error) {
      return { data: null, error };
    }
  }

  // Alias for execute to match Supabase API
  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

class SupabaseAuth {
  constructor(client) {
    this.client = client;
  }

  async getUser() {
    return this.client.getUser();
  }

  async signOut() {
    return this.client.signOut();
  }

  async signInWithOAuth({ provider, options = {} }) {
    try {
      console.log('Starting OAuth flow for provider:', provider);
      
      // Build the OAuth URL manually
      const supabaseUrl = this.client.url;
      const redirectTo = options.redirectTo || window.location.origin;
      
      // Generate random state for CSRF protection
      const state = Math.random().toString(36).substring(7);
      localStorage.setItem('supabase_oauth_state', state);
      
      // Ensure redirect URL matches Supabase's expected format
      const siteUrl = 'https://www.zendegen.app';
      const callbackPath = '/oauth-callback.html';
      
      // Construct Supabase OAuth URL
      const oauthUrl = `${supabaseUrl}/auth/v1/authorize?` + 
        `provider=${provider}` +
        `&redirect_to=${encodeURIComponent(siteUrl + callbackPath)}` +
        `&state=${state}` +
        `&auth_key=${this.client.key}` +
        `&type=web` +
        `&prompt=select_account`;
      
      console.log('Generated OAuth URL:', oauthUrl);
      
      return {
        data: { url: oauthUrl },
        error: null
      };
    } catch (error) {
      console.error('OAuth URL generation error:', error);
      return { data: null, error };
    }
  }
}

// Create and export the Supabase client
const supabaseClientInstance = new SupabaseClient(supabaseUrl, supabaseAnonKey);

// Export for ES6 modules
export const supabase = supabaseClientInstance;

// Also export to global scope for non-module scripts
if (typeof window !== 'undefined') {
  window.supabase = supabaseClientInstance;
}
