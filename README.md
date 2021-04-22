# .env file

All <> placeholders must be replaced.

Line 1: <TENANT> is your Crossid tenant, don't have a tenant yet? create one for free!  
Line 2: <CLIENT_ID> is the client id you get by telling Crossid about your app.  
Line 3: Choose a long random string (note: this is not a client secret, it's secret for protecting the session cookie).  
Line 4: <CLIENT_SECRET> is the client secret you set when creating your app.

Note that we use https in our BASE_URL to avoid cookie policy issues so proxy is needed (see Caddy below).

# Run

npm install  
node server.js
