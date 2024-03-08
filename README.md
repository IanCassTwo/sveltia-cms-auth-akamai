## Sveltia CMS Auth Akamai Edgeworker
This is an Akamai Edgeworker for implementing Sveltia CMS (or Netlify/Decap CMS) OAuth authentication to Github. This was based on the https://github.com/sveltia/sveltia-cms-auth repo.

### How to use it
#### Step 1 Create Edgeworker
Create a tarball from the files in the edgeworker directory. Use Akamai Control Centre to make a new Edgeworker and upload the tarball. Alternatively, use the bundle editor in the GUI to copy/paste the source code. For more information see https://techdocs.akamai.com/edgeworkers/docs/create-an-edgeworker-id

#### Step 2 Register the Worker as a GitHub OAuth app
Register a new OAuth application on GitHub (details) with the following properties, including your Worker URL from Step 1:

Application name: Sveltia CMS Authenticator (or whatever)
Homepage URL: https://<your site> (or whatever)
Application description: (can be left empty)
Authorization callback URL: https://<your site>/callback
Once registered, click on the Generate a new client secret button. The app’s Client ID and Client Secret will be displayed. We’ll use them in Step 3 below.

#### Step 3 Update your delivery configuration
The Akamai Edgeworker works in conjunction with your Akamai Property Manager delivery configuration. We need to add some variables and also some new rules to your property.

##### Variables
Define the following variables in your property set as "hidden". Do not set to "sensitive" or the Edgworker won't be able to access them
PMUSER_GITHUB_CLIENT_SECRET = your Github Oauth client secret
PMUSER_GITHUB_CLIENT_ID = your Github Oauth client id

##### Rules
Add the following rules to your property
* Firstly, you should make add a rule at top level called "CMS Auth". Add a path match condition for "/auth", "/token", and "/callback". Add a caching behaviour to this rule to set no-store.
* Next, add a child rule underneath the "CMS Auth" rule called "Edgeworker" with a path match condition for "/auth" and "/callback". Add an Edgeworker behaviour to reference the Edgeworker that you created in step 1. This rule will cause any requests for /auth and /callback to be directed towards the Edgeworker
* Lastly, create another child rule underneath the "CMS Auth" rule called "Proxy" with a path match condition for "/token". You should add an Origin behaviour with "github.com" as the origin hostname. You should also add a Modify Outgoing Request Path behaviour with action "Replace entire path" with value "/login/oauth/access_token". And lastly, add an Allow POST behaviour. The purpose of this rule is to allow the Edgeworker to talk to Github to retrieve the access token. An Edgeworker cannot talk directly to third parties. All access must be proxied through the delivery property for security reasons.

#### Step 4 Update your CMS configuration
Open admin/config.yml locally or remotely, and add your Worker URL from Step 1 as the new base_url property under backend:

''''
 backend:
   name: github
   repo: username/repo
   branch: main
+  base_url: https://<your site>
''''

_Note, the base_url must be the root url. You can't locate the authentication mechanism under a subdirectory. Neither Sveltia nor Decap will allow this. If the authentication endpoint clash with other urls on your site, you should create a new site entirely to host this e.g. auth.yourdomain.com and use that instead with an appropriate CORS policy_

Commit the change. Once deployed, you can sign into Sveltia CMS remotely with GitHub!
