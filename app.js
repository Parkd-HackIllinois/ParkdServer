
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
    'addUser': "INSERT INTO users (email, pass, salt) VALUES (?, ?, ?)",
    'changePassword': "UPDATE users SET pass=? WHERE id=?"
}

// error functions
var errorFunc = function(res) {
    res.writeHead(400); // bad request
    res.end();
};
var sendError = function(reason, res) {
    res.writeHead(400, reason);
    res.end('{ "error":"'+reason+'" }');
}

// password encyrption
var bcrypt = require('bcrypt');

// http path functions
var apiRoot = "/api/0.1";
var httpPaths = {}

httpPaths[apiRoot + "/login"] = function(req, res) { // login endpoint
    if (req.method == "POST")
    {
        req.on('data', function(data) { 
            post = JSON.parse(""+data);
            
            // sql stuff
            sqlPool.getConnection(function(err, con) {
                con.query(sql.userByEmail, [post.email], function(err, rows) {
                    if (rows)
                    {
                        var salt = rows[0].salt;
                        var sqlPass = rows[0].pass;
                        var calculated = bcrypt.hashSync(post.pass, salt);
                        if (calculated === sqlPass)
                        {
                            res.writeHead(200);
                            res.end('{ "id":'+rows[0].id + '}');
                        }
                        else
                        {
                            sendError("Wrong password", res);
                        }
                    }
                    else
                    {
                        sendError("Email not found", res);
                    }
                });
                con.release();
            });
        });
    }
    else
        errorFunc(res);
}


httpPaths[apiRoot + "/register"] = function(req, res) { // register endpoint
    if (req.method == "POST")
    {
        req.on('data', function(data) { 
            post = JSON.parse(""+data);

            //gen pass and salt
            var salt = bcrypt.genSaltSync(10);
            var hashPass = bcrypt.hashSync(post.pass, salt)

            // sql stuff
            sqlPool.getConnection(function(err, con) {
                con.query(sql.addUser, [post.email, hashPass, salt], function(err, result) {
                    if (err)
                    {
                        res.writeHead(409);
                        res.end();
                    }
                    else
                    {
                        var id = result.insertId;
                        res.writeHead(201);
                        res.end('{ "id":'+id+'}');
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
