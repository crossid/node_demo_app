const express = require("express");
const yaml = require("js-yaml");
const fs = require("fs");
const { auth } = require("express-openid-connect");
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

require("dotenv").config();

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

function checkScopes(yamlFile) {
  const fileContents = fs.readFileSync(yamlFile, "utf8");
  let data = yaml.load(fileContents);

  const r = express.Router();

  // convert the openApi definitioons to express routes
  Object.keys(data.paths).forEach((path) => {
    const pathDef = data.paths[path];

    //converts openapi's {var} it expresse's :var
    const expressPath = path.replace(/\{([a-zA-Z0-9-_]*)\}/g, ":$1");
    Object.keys(pathDef).forEach((verb) => {
      // add route to figutre out which route was called
      r[verb.toLowerCase()](expressPath, function (req, res, next) {
        next(pathDef[verb].operationId);
      });
    });
  });

  return function (req, res, next) {
    // figure out which openapi route matches the request
    r.handle(req, res, function (requiredScope) {
      // handle missing openApi definition
      if (!requiredScope) {
        res.sendStatus(404);
        return;
      }

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
          if (token.scp.includes(requiredScope)) {
            next();
          } else {
            res.sendStatus(403);
            return;
          }
        }
      );
    });
  };
}

const app = express();

app.set("trust proxy", true);

app.use(
  auth({
    authorizationParams: {
      response_type: process.env.RESPONSE_TYPE,
      audience: "petstore", // request access to api1
      scope: "openid showPetById", // request specific permissions
    },
  })
);

app.use(checkScopes("./petstore.yaml"));

app
  .get("/pets", (req, res) => {
    res.send(`list pets`);
  })
  .post("/pets", (req, res) => {
    res.send(`add pet`);
  })
  .get("/pets/:petId", (req, res) => {
    res.send(`get pet ${req.params.petId}`);
  });

app.listen(3005, () => console.log("listening at http://localhost:3005"));
