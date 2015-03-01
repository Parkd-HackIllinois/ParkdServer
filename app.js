
// Configuration stuff
var nconf = require('nconf');
nconf.argv().env(); // check CI and env args
nconf.file({ file: 'config.json' }); // load config json

// mysql connections
var mysql = require('mysql');
var sqlPool = mysql.createPool(nconf.get("mysql"));

// prepared sql statements
var sql = {
    'userById': "SELECT * FROM users WHERE id=?",
    'userByEmail': "SELECT * FROM users WHERE email=?",
    'addUser': "INSERT INTO users (email, pass) VALUES (?, ?)",
    'changePassword': "UPDATE users SET pass=? WHERE id=?"
}

// error functions
var errorFunc = function(res) {
    res.writeHead(400); // bad request
    res.end();
};
var sendError = function(code, reason, res) {
    res.writeHead(204, reason);
    res.end('{ "error":"'+reason+'" }');
}

// password encyrption
var bcrypt = require('bcrypt');

// http path functions
var apiRoot = "/api/0.1";
var httpPaths = {}
httpPaths[apiRoot + "/login"] = function(req, res) {
    if (req.method == "POST")
    {
        req.on('data', function(data) { 
            post = JSON.parse(""+data);
            console.log(post);
            // sql stuff
            sqlPool.getConnection(function(err, con) {
                con.query(sql.userByEmail, [post.email], function(err, rows) {
                    if (rows)
                    {
                        var salt = rows[0].salt;
                        var sqlPass = rows[0].pass;
                        salt = bcrypt.genSaltSync(10);
                        console.log(salt);
                        var calculated = bcrypt.hashSync(post.pass, salt);
                        if (calculated === sqlPass)
                        {
                            console.log("GOOD!")
                            res.writeHead(200);
                            res.end('{ "id":'+rows[0].id);
                        }
                        else
                        {
                            console.log("BAD!")
                            sendError(403, "Wrong Password", res);
                        }
                    }
                    else
                    {
                        sendError(204, "email not found", res);
                    }
                });
                con.release();
            });
        });
    }
    else
        errorFunc(res);
}

// actual HTTP listenning
var urlParser = require('url')
var http = require('http');
var server = http.createServer(function(req, res) {
    var parsed = urlParser.parse(req.url);
    if (parsed.pathname in httpPaths)
    {
        try
        {
            httpPaths[parsed.pathname](req, res);
        }
        catch(e)
        {
            errorFunc(res);
        }
    }
    else
    {
        res.writeHead(404);
        res.end();
    }
});

// kill sql connections properly
server.on("close", function() { sqlPool.end() })

server.listen(nconf.get("http:port"));
