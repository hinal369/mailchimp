const express = require("express");
const querystring = require("querystring");
const bodyParser = require("body-parser");
const { URLSearchParams } = require("url");
const mailchimp = require("@mailchimp/mailchimp_marketing");
const serverless = require('serverless-http');

// Basic express app setup
const app = express();
const router = express.Router();

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

// You should always store your client id and secret in environment variables for security — the exception: sample code.
const MAILCHIMP_CLIENT_ID = "394913959175";
const MAILCHIMP_CLIENT_SECRET =
  "2810f228ecd86ae0e24c25ba399465c6c50d05b38daf3a778a";
const BASE_URL = "https://userlove.dev";
const OAUTH_CALLBACK = `${BASE_URL}/oauth/mailchimp/callback`;

// 1. Navigate to http://127.0.0.1:3000 and click Login
router.get("/", function(req, res) {
  res.send(
    '<p>Welcome to the sample Mailchimp OAuth app! Click <a href="/auth/mailchimp">here</a> to log in</p>'
  );
});

// 2. The login link above will direct the user here, which will redirect
// to Mailchimp's OAuth login page.
router.get("/auth/mailchimp", (req, res) => {
  try {
    res.redirect(
      `https://login.mailchimp.com/oauth2/authorize?${querystring.stringify({
        response_type: "code",
        client_id: MAILCHIMP_CLIENT_ID,
        redirect_uri: "https://userlove.dev"
      })}`
    );
  } catch (error) {
    console.log(error);
  }
  
});

// 3. Once // 3. Once the user authorizes your app, Mailchimp will redirect the user to
// this endpoint, along with a code you can use to exchange for the user's
// access token.
router.get("/oauth/mailchimp/callback", async (req, res) => {
  try {
    console.log("callback");
    const {
      query: { code }
    } = req;
  
    // Here we're exchanging the temporary code for the user's access token.
    const tokenResponse = await fetch(
      "https://login.mailchimp.com/oauth2/token",
      {
        method: "POST",
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: MAILCHIMP_CLIENT_ID,
          client_secret: MAILCHIMP_CLIENT_SECRET,
          redirect_uri: OAUTH_CALLBACK,
          code
        })
      }
    );
  
    const { access_token } = await tokenResponse.json();
    console.log("access_token", access_token);
  
    // Now we're using the access token to get information about the user.
    // Specifically, we want to get the user's server prefix, which we'll use to
    // make calls to the API on their behalf.  This prefix will change from user
    // to user.
    const metadataResponse = await fetch(
      "https://login.mailchimp.com/oauth2/metadata",
      {
        headers: {
          Authorization: `OAuth ${access_token}`
        }
      }
    );
  
    const { dc } = await metadataResponse.json();
    console.log(dc);
  
    // Below, we're using the access token and server prefix to make an
    // authenticated request on behalf of the user who just granted OAuth access.
    // You wouldn't keep this in your production code, but it's here to
    // demonstrate how the call is made.
  
    mailchimp.setConfig({
      accessToken: access_token,
      server: dc
    });
  
    const response = await mailchimp.ping.get();
    console.log(response);
  
    res.send(`
      <p>This user's access token is ${access_token} and their server prefix is ${dc}.</p>
  
      <p>When pinging the Mailchimp Marketing API's ping endpoint, the server responded:<p>
  
      <code>${response}</code>
    `);
  
    // In reality, you'd want to store the access token and server prefix
    // somewhere in your application.
    // fakeDB.getCurrentUser();
    // fakeDB.storeMailchimpCredsForUser(user, {
    //   dc,
    //   access_token
    // });
  } catch (error) {
    console.log(error);
  }
});

app.use('/.netlify/functions/api', router);
module.exports.handler = serverless(app);
app.listen(3000, "127.0.0.1", function() {
  console.log(
    "Server running on port 3000; visit http://127.0.0.1:3000"
  );
});