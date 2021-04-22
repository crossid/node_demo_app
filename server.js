const express = require("express");
const { auth } = require("express-openid-connect");
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

const client = jwksClient({
  jwksUri: process.env.ISSUER_BASE_URL + "/.well-known/jwks.json",
  cache: true, // cache the key results
  requestHeaders: {}, // Optional
  timeout: 30000, // Defaults to 30s
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    var signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

require("dotenv").config();
const app = express();
app.use(
  auth({
    authorizationParams: {
      response_type: "code id_token", //request both user info and scopes
      audience: "api1", // request access to api1
      scope: "openid read:api1 write:api1", // request specific permissions
    },
  })
);

function checkScopes(scope) {
  return function (req, res, next) {
    // check that the user is authenticated
    if (!req.oidc || !req.oidc.accessToken) {
      res.sendStatus(401);
      return;
    }

    // check that the token is valid
    jwt.verify(
      req.oidc.accessToken.access_token,
      getKey,
      {},
      function (err, token) {
        if (err) {
          res.sendStatus(403);
          return;
        }

        // check that the token has the needed scope
        if (token.scp.includes(scope)) {
          next();
        } else {
          res.sendStatus(403);
          return;
        }
      }
    );
  };
}

app.set("trust proxy", true);
app.get("/", (req, res) => {
  res.send(`hello ${req.oidc.user.user_name}`);
});
app.get("/read", checkScopes("read:api1"), (req, res) => {
  res.send(`hello ${req.oidc.user.user_name}`);
});
app.get("/write", checkScopes("write:api1"), (req, res) => {
  res.send(`hello ${req.oidc.user.user_name}`);
});
app.get("/forbid", checkScopes("read:api2"), (req, res) => {
  res.send(`hello ${req.oidc.user.user_name}`);
});
app.listen(3005, () => console.log("listening at http://localhost:3005"));
