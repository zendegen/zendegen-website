// Local Supabase client for Chrome extensions (no CDN imports)
// This avoids CSP issues by using only local code

// Persist sessions in chrome.storage.local (MV3-safe)
const ChromeStorageAdapter = {
  getItem: async (key) =>
    new Promise((resolve) => {
      chrome.storage.local.get([key], (res) => resolve(res[key] ?? null));
    }),
  setItem: async (key, value) =>
    new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => resolve());
    }),
  removeItem: async (key) =>
    new Promise((resolve) => {
      chrome.storage.local.remove([key], () => resolve());
    }),
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

  async signInWithOAuth({ provider, options }) {
    // Use the proper Supabase OAuth URL
    const redirectTo = options.redirectTo || chrome.runtime.getURL('auth.html');
    
    // Construct the authorization URL with all necessary parameters
    const params = new URLSearchParams({
      provider: provider,
      redirect_to: redirectTo,
    });
    
    const authUrl = `${this.url}/auth/v1/authorize?${params.toString()}`;
    
    console.log('Opening OAuth popup:', authUrl);
    console.log('Redirect to:', redirectTo);
    
    // Open OAuth in a compact centered popup window
    try {
      const width = 450;
      const height = 650;
      const left = Math.round((screen.width - width) / 2);
      const top = Math.round((screen.height - height) / 2);
      
      const popup = window.open(
        authUrl,
        'google-oauth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
      );
      
      if (!popup) {
        console.error('Popup was blocked');
        return { error: new Error('Popup was blocked. Please allow popups for this extension.') };
      }
      
      // Monitor popup for completion
      // Note: We can't check popup.location due to COOP, so we just monitor if it's closed
      const checkPopup = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(checkPopup);
            console.log('OAuth popup closed');
            return;
          }
        } catch (e) {
          // COOP policy may block popup.closed check in some cases
          // If we can't check, the interval will continue until popup actually closes
        }
      }, 500);
      
      return { error: null };
    } catch (error) {
      console.error('Failed to open OAuth popup:', error);
      return { error };
    }
  }

  async signOut() {
    try {
      await ChromeStorageAdapter.removeItem('supabase.auth.token');
      await ChromeStorageAdapter.removeItem('supabase.auth.refresh_token');
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  async getUser() {
    try {
      const token = await ChromeStorageAdapter.getItem('supabase.auth.token');
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
        
        // Return user info from token payload (no network call needed!)
        const user = {
          id: payload.sub,
          email: payload.email,
          user_metadata: payload.user_metadata || {},
          app_metadata: payload.app_metadata || {}
        };
        
        return { data: { user } };
      } catch (decodeError) {
        console.error('Failed to decode token, falling back to API call:', decodeError);
        
        // Fallback to network call if token decode fails
        const response = await fetch(`${this.url}/auth/v1/user`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': this.key
          }
        });

        if (response.ok) {
          const user = await response.json();
          return { data: { user } };
        } else {
          return { data: { user: null } };
        }
      }
    } catch (error) {
      console.error('getUser error:', error);
      return { data: { user: null } };
    }
  }

  // Database methods
  from(table) {
    // Return table query builder synchronously, fetch token inside the builder
    return new SupabaseTable(this.url, this.key, null, table);
  }

  // Storage methods
  get storage() {
    return new SupabaseStorage(this.url, this.key);
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
      // Fetch token if not already set
      if (!this.token) {
        this.token = await ChromeStorageAdapter.getItem('supabase.auth.token');
      }

      const headers = {
        'apikey': this.key,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      };

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
        headers
      };

      if (this.query.data) {
        options.body = JSON.stringify(this.query.data);
      }

      const response = await fetch(url, options);
      
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
    this.listeners = [];
  }

  onAuthStateChange(callback) {
    this.listeners.push(callback);
    // Check auth state periodically
    setInterval(async () => {
      const { data: { user } } = await this.client.getUser();
      this.listeners.forEach(listener => listener({ user }));
    }, 1000);
  }

  async getUser() {
    return this.client.getUser();
  }

  async signInWithOAuth(options) {
    return this.client.signInWithOAuth(options);
  }

  async signOut() {
    return this.client.signOut();
  }
}

// Supabase Storage class
class SupabaseStorage {
  constructor(url, key) {
    this.url = url;
    this.key = key;
  }

  from(bucket) {
    return new SupabaseBucket(this.url, this.key, bucket);
  }
}

// Supabase Bucket class for storage operations
class SupabaseBucket {
  constructor(url, key, bucket) {
    this.url = url;
    this.key = key;
    this.bucket = bucket;
  }

  async upload(path, file, options = {}) {
    try {
      const token = await ChromeStorageAdapter.getItem('supabase.auth.token');
      if (!token) {
        return { data: null, error: new Error('Not authenticated') };
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'apikey': this.key
      };

      // If file is a File/Blob, use it directly
      // If it's a base64 string, convert it
      let body = file;
      if (typeof file === 'string' && file.startsWith('data:')) {
        // Convert base64 to blob
        const response = await fetch(file);
        body = await response.blob();
      }

      const uploadUrl = `${this.url}/storage/v1/object/${this.bucket}/${path}`;
      
      const uploadOptions = {
        method: 'POST',
        headers,
        body
      };

      // Add upsert option if specified
      if (options.upsert) {
        uploadOptions.headers['x-upsert'] = 'true';
      }

      const response = await fetch(uploadUrl, uploadOptions);

      if (response.ok) {
        const data = await response.json();
        return { data, error: null };
      } else {
        const error = await response.json();
        return { data: null, error };
      }
    } catch (error) {
      console.error('Upload error:', error);
      return { data: null, error };
    }
  }

  async remove(paths) {
    try {
      const token = await ChromeStorageAdapter.getItem('supabase.auth.token');
      if (!token) {
        return { data: null, error: new Error('Not authenticated') };
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'apikey': this.key,
        'Content-Type': 'application/json'
      };

      const deleteUrl = `${this.url}/storage/v1/object/${this.bucket}`;
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ prefixes: Array.isArray(paths) ? paths : [paths] })
      });

      if (response.ok) {
        const data = await response.json();
        return { data, error: null };
      } else {
        const error = await response.json();
        return { data: null, error };
      }
    } catch (error) {
      console.error('Delete error:', error);
      return { data: null, error };
    }
  }

  getPublicUrl(path) {
    // For private buckets, this returns a URL that requires auth
    // For public buckets, this returns a publicly accessible URL
    const publicUrl = `${this.url}/storage/v1/object/public/${this.bucket}/${path}`;
    return { data: { publicUrl } };
  }

  async createSignedUrl(path, expiresIn = 3600) {
    try {
      const token = await ChromeStorageAdapter.getItem('supabase.auth.token');
      if (!token) {
        return { data: null, error: new Error('Not authenticated') };
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'apikey': this.key,
        'Content-Type': 'application/json'
      };

      const signedUrlEndpoint = `${this.url}/storage/v1/object/sign/${this.bucket}/${path}`;
      
      const response = await fetch(signedUrlEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ expiresIn })
      });

      if (response.ok) {
        const data = await response.json();
        // Construct full signed URL
        const signedUrl = `${this.url}/storage/v1${data.signedURL}`;
        return { data: { signedUrl }, error: null };
      } else {
        const error = await response.json();
        return { data: null, error };
      }
    } catch (error) {
      console.error('Signed URL error:', error);
      return { data: null, error };
    }
  }
}

// Create and export the Supabase client
const supabaseClientInstance = new SupabaseClient(supabaseUrl, supabaseAnonKey);

// Export for ES6 modules
export const supabase = supabaseClientInstance;

// Also export to global scope for service worker importScripts compatibility
if (typeof globalThis !== 'undefined') {
  globalThis.supabase = supabaseClientInstance;
}
if (typeof self !== 'undefined' && typeof self.importScripts !== 'undefined') {
  // Service Worker context
  self.supabase = supabaseClientInstance;
}
