
// Configuration stuff
var nconf = require('nconf');
nconf.file({ file: 'config.json' }); // load config json
nconf.argv().env(); // check CI and env args

// mysql connections


// HTTP stuff
var http = require('http');
var server = http.createServer(function(req, res) {
  res.writeHead(200);
  res.end('Hello Http');
});
server.listen(nconf.get("http:port"));
