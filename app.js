
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
    'changePassword': "UPDATE users SET pass=? WHERE id=?",
    'delUser': "DELETE FROM users WHERE id=?",
    'getOpenSpots': "SELECT * FROM spots WHERE occupant IS NULL",
    'updateSpot': "UPDATE spots SET filled=? WHERE id IN (?)"
}

// error functions
var die = function(res) {
    res.writeHead(500); // I give up...
    res.end();
};
var badMethod = function(res, methods) {
    res.writeHead(405, { "Allow": res.join(', ')});
    res.end();
}
var sendError = function(res, reason) {
    var string = JSON.stringify( { 'error': reason });
    res.writeHead(400, reason, {
        "Content-Type": "application/json",
        "Content-Language": "en",
        "Content-Length": Buffer.byteLength(string, 'utf8')
    });
    res.end(string);
}
var sendJson = function(res, code, data) {
    var string = JSON.stringify(data);
    res.writeHead(code, {
        "Content-Type": "application/json",
        "Content-Language": "en",
        "Content-Length": Buffer.byteLength(string, 'utf8')
    });
    res.end(string);
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
                            sendJson(res, 200, { 'id': rows[0].id });
                        }
                        else
                        {
                            sendError(res, "Wrong password");
                        }
                    }
                    else
                    {
                        sendError(res, "Email not found");
                    }
                });
                con.release();
            });
        });
    }
    else
        badMethod(["POST"],  res);
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
                        sendJson(res, 201, { 'id': result.insertId });
                    }
                });
                con.release();
            });
        });
    }
    else
        badMethod(["POST"],  res);
}

httpPaths[apiRoot + "/deleteUser"] = function(req, res) { // register endpoint
    if (req.method == "POST")
    {
        req.on('data', function(data) { 
            post = JSON.parse(""+data);

            // sql stuff
            sqlPool.getConnection(function(err, con) {
                con.query(sql.delUser, [post.id], function(err, result) {
                        res.writeHead(200);
                        res.end();
                });
            con.release();
            });
        });
    }
    else
        badMethod(["POST"],  res);
}

httpPaths[apiRoot + "/getOpenSpots"] = function(req, res) { // register endpoint
    if (req.method == "POST")
    {
        req.on('data', function(data) { 
            post = JSON.parse(""+data); // long, lata

            // 1/2 mile = 0.009 long/lat
            var startLong = post.longitude - .009;
            var endLong = post.longitude + .009;
            var startLat = post.latitude - .009;
            var endLat = post.latitude + .009;

            // swap vars to ensure start is smaller
            if (endLong < startLong)
                startLong = [endLong, endLong = startLong][0];
            if (endLat < startLat)
                startLat = [endLat, endLat = startLat][0];

            // sql stuff
            sqlPool.getConnection(function(err, con) {
                con.query(sql.getOpenSpots, [startLong, endLong, startLat, endLat], function(err, rows) {

                    var output = { 'spots': [], 'suggested': [] };
                    for (index in rows)
                    {
                        if (rows[index].long < startLong || rows[index].long > endLong)
                            continue;

                        if (rows[index].lat < startLat || rows[index].lat > endLat)
                            continue;
                        
                        if (rows[index].filled)
                            output.suggested.push(rows[index].id);

                        output.spots.push(rows[index].id);
                    }

                    sendJson(res, 200, output);
                });
            con.release();
            });
        });
    }
    else
        badMethod(["POST"],  res);
}

httpPaths[apiRoot + "/cameraPush"] = function(req, res) { // register endpoint
    if (req.method == "POST")
    {
        req.on('data', function(data) { 
            post = JSON.parse(""+data);

            // sql stuff
            sqlPool.getConnection(function(err, con) {
                if (post.open)
                {
                    con.query(sql.updateSpot, [0, post.open], function(err, result) {
                        if (err)
                            console.log(err);
                    });
                }

                if (post.closed)
                {
                    con.query(sql.updateSpot, [1, post.closed], function(err, result) {
                        if (err)
                            console.log(err);
                    });
                }

                con.release();
            });


            res.writeHead(200);
            res.end();
        });
    }
    else
        badMethod(["POST"],  res);
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
            die(res);
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
