import { httpRequest } from 'http-request';
import { createResponse } from 'create-response';
import URLSearchParams from 'url-search-params'; 

async function auth(context, request) {	
	if (context.githubClientId) {
		var responseHeaders = {}
		responseHeaders.location = [ `https://github.com/login/oauth/authorize?client_id=${context.githubClientId}&scope=repo,user` ]
		return Promise.resolve(createResponse(302, responseHeaders, ''));
	} 
	return Promise.resolve(createResponse(403,{}, 'missing github client id'));
}

async function callback(context, request) {
  var params = new URLSearchParams(request.query);
  var code = params.get("code");

  var failureContent = {};
  var failureStatus = 400;

  if (code && context.githubClientId && context.githubClientSecret) {
    var tokenResponse = await httpRequest(`${request.scheme}://${request.host}/token`, {
          method: "POST",
          headers: { 
		"Accept": ["application/json"],
		"Content-Type": ["application/json"]
	  },
        body: JSON.stringify({
			client_id: context.githubClientId,
			client_secret: context.githubClientSecret,
			code: code
	  	}),
      });
	  
	  if (tokenResponse.ok) {
		  let token;
		  let error;
		  let provider = 'github';
		  ({ access_token: token, error } = await tokenResponse.json()); 
		  const status = error?'error':'success';
		  const content = error?{ error } : { provider, token };

		  return Promise.resolve(
			createResponse(
				tokenResponse.status, 
					{'Content-Type': 'text/html;charset=UTF-8'}, 
					`<!doctype html><html><body><script>
  (function() {
    function receiveMessage(e) {
      console.log("receiveMessage %o", e)
      window.opener.postMessage(
        'authorization:${provider}:${status}:${JSON.stringify(content)}',
        e.origin
      )
      window.removeEventListener("message",receiveMessage,false);
    }
    window.addEventListener("message", receiveMessage, false)
    console.log("Sending message: %o", "${provider}")
    window.opener.postMessage("authorizing:${provider}", "*")
    })()
  </script></body></html>`	
			)
		  );
	  } else {
		var x = await tokenResponse.text();
		try {
		  failureContent = JSON.parse(x);
		  failureContent.url = redirecturl;
		} catch (err) {
		  failureContent.error = "callback_failure";
		  failureStatus = tokenResponse.status;      
		  failureContent.description = "callback received indicates error";
		  failureContent.details = x;
		  failureContent.path = `${request.scheme}://${request.host}/token`
		}
	  }
  } else {
    failureContent.error = "no code";
    failureContent.description = `callback request not initiated, redirect-url:${redirecturl}, query:${request.query}`;
  }

  return Promise.resolve(
    createResponse(failureStatus, {'content-type': ['application/json']}, JSON.stringify(failureContent)));  
}

export async function responseProvider (request) {
	var context = {};
	context.githubClientId = request.getVariable(`PMUSER_GITHUB_CLIENT_ID`);
	context.githubClientSecret = request.getVariable(`PMUSER_GITHUB_CLIENT_SECRET`);

	if (request.path.endsWith('/auth')) {
		return auth(context, request);
	}	

	if (request.path.endsWith('/callback')) {
		return callback(context, request);
	}	
}
