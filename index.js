const http = require('http');
const qs = require('querystring');
var elasticsearch = require('elasticsearch');

var time='';

// Create elastic client 
var client = new elasticsearch.Client({
  host: 'https://**************.eu-west-1.aws.found.io:9243',
  log: {
      type: 'stdio',
      level: 'error'
  },
  httpAuth: 'elastic:**************',
  apiVersion: '5.0',
});

// Get Cluster health information
client.cluster.health({},function(err,resp,status) {  
  console.log("-- Client Health --",resp);
  console.log("-------------------------------------------");
});

client.ping({
  // ping usually has a 3000ms timeout 
  requestTimeout: Infinity
}, function (error) {
  if (error) {
    console.trace('elasticsearch cluster is down!');
  } else {
    console.log('elasticsearch cluster is ok');
  }
});



// Get Cluster health information
http.createServer(function (req, res) {
   
   var requestBody = '';
   var responseString = '';

    if (req.method == "OPTIONS" ) {

        writeLogString(req, res);

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.writeHead(200);
        res.end();
        return; 
    }

    if (req.method == "POST" ) {
        
        req.on('data', function (data) {

            requestBody += data;
            // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
            if (requestBody.length > 1e6) { 
                // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
                req.connection.destroy();
            }
        });

        req.on('end', function () {

            // If receive POST without body
            if (IsJsonString(requestBody)) {

                //console.log("Json string:" + requestBody);

                var jsonToJson = JSON.parse(requestBody);
                
                time = new Date();
                jsonToJson.timestamp = time;
                
                jsonToJson.message = requestBody;

                //console.log("Json:" + JSON.stringify(requestBody));

                client.bulk({  
                    body: [
                        { index:  
                            {   _index: 'logstash', 
                                _type: 'mytype', 
                            } 
                        },
                        jsonToJson // <-- Send to elastic this var
                    ]

                }, function (error, response, status) {

                    if (error){
                        console.log("search error: "+error)
                    }
                    else {
                        responseMessage = JSON.stringify(response);
                        
                        writeLogString(req, res, requestBody, responseMessage);

                        res.write('OK');
                        res.end();
                    }
                })
            } else {
                res.statusCode = 400;
                responseMessage = 'POST body is not a JSON';

                writeLogString(req, res, requestBody, responseMessage);

                res.write(responseMessage);
                res.end();
            }
        });
    } else {
        res.statusCode = 405;
        responseMessage= 'The requested resource does not support http method ' + req.method;
        
        writeLogString(req, res, requestBody, responseMessage);

        res.write(responseString);
        res.end();
       
    }       
   

}).listen(3000);


// Check JSON function
function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function writeLogString(req, res, requestBody, responseMessage) {
  console.info('[' + new Date().toString() + 
    '] '+req.method, 
    'Body: '+requestBody,
    'Request: '+req.url,
    'Host: '+req.headers['host'],
    'User-agent: '+req.headers['user-agent'],
    'Referer: '+req.headers['referer'],
    'X-Forwarded-for: '+req.headers['x-forwarded-for'],
    'Resp-status: '+res.statusCode,
    'Response Message: '+responseMessage);
}