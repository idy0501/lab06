var http = require('http');
var url  = require('url');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var mongourl = 'mongodb://localhost:27017/test';
var APIKEY = "N9T441gbo2OkmT44HQmh4V5uRdPdt-_E";

var server = http.createServer(function (req,res) {
	console.log("INCOMING REQUEST: " + req.method + " " + req.url);

	var parsedURL = url.parse(req.url,true); //true to get query as object
	var queryAsObject = parsedURL.query;

	if (!(
		parsedURL.pathname == '/create' ||
		parsedURL.pathname == '/read' ||
		parsedURL.pathname == '/update' ||
		parsedURL.pathname == '/delete' ||
		parsedURL.pathname == '/'
		)) {
		res.writeHead(404, {"Content-Type": "text/plain"});
		res.write("404 Not Found\n");
		res.end();
	}
	else {
		console.log('criteria = ' + JSON.stringify(queryAsObject));
		switch(parsedURL.pathname) {
			case "/":
				findByBorough(res,req);
				break;
			case "/read":   // /read?criteria=xxx
				read_n_print(res,queryAsObject);
				break;
			case "/create":
				create(res,queryAsObject);
				break;
			case "/delete":
				deleteMany(res,queryAsObject);
				break;
			default:
				res.writeHead(500, {"Content-Type": "text/plain"});
				res.write(parsedURL.pathname + " not available yet\n");
				res.end();
		}
	}
});

function create(res,queryAsObject) {
	var r = {};  // new restaurant to be inserted
	r['address'] = {};
	r.address.street = (queryAsObject.street != null) ? queryAsObject.street : null;
	r.address.zipcode = (queryAsObject.zipcode != null) ? queryAsObject.zipcode : null;
	r.address.building = (queryAsObject.building != null) ? queryAsObject.building : null;
	r.address['coord'] = [];
	r.address.coord.push(queryAsObject.lon);
	r.address.coord.push(queryAsObject.lat);
	r['borough'] = (queryAsObject.borough != null) ? queryAsObject.borough : null;
	r['cuisine'] = (queryAsObject.cuisine != null) ? queryAsObject.cuisine : null;
	r['name'] = (queryAsObject.name != null) ? queryAsObject.name : null;
	r['restaurant_id'] = (queryAsObject.restaurant_id != null) ? queryAsObject.restaurant_id : null;
	//
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		db.collection('restaurants').insertOne(r,
			function(err,result) {
				assert.equal(err,null);
				console.log("insertOne() was successful _id = " +
					JSON.stringify(result.insertedId));
				db.close();
				console.log('Disconnected from MongoDB\n');
				res.writeHead(200, {"Content-Type": "text/plain"});
				res.end('Insert was successful ' + JSON.stringify(r));
			});
	});
}

function deleteMany(res,queryAsObject) {
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		db.collection('restaurants').deleteMany(queryAsObject,
			function(err,result) {
				assert.equal(err,null);
				console.log("deleteMany() was successful _id = " +
					JSON.stringify(queryAsObject));
				db.close();
				res.writeHead(200, {"Content-Type": "text/plain"});
				res.end('Delete was successful ' + JSON.stringify(queryAsObject));
			});
	});
}

function read_n_print(res,criteria) {
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			console.log('Connected to MongoDB\n');
			findRestaurants(db,criteria,function(restaurants) {
				db.close();
				console.log('Disconnected MongoDB\n');
				res.writeHead(200, {"Content-Type": "text/html"});
				res.write('<html><head><title>Restaurant</title></head>');
				res.write('<body><H1>Restaurants</H1>');
				res.write('<H2>Showing '+restaurants.length+' document(s)</H2>');
				res.write('<H3>Criteria: </i>' + JSON.stringify(criteria) + '</i></H3>');
				res.write('<ol>');
				for (var i in restaurants) {
					res.write('<li>'+restaurants[i].name+'</li>');
				}
				res.write('</ol>');
				res.end('</body></html>');
				return(restaurants);
			});
		});
}

function findRestaurants(db,criteria,callback) {
	var restaurants = [];
	//cursor = db.collection('restaurants').find(criteria).limit(20);
	cursor = db.collection('restaurants').find(criteria);
	cursor.each(function(err, doc) {
		assert.equal(err, null);
		if (doc != null) {
			restaurants.push(doc);
		} else {
			callback(restaurants);
		}
	});
}

function findDistinctBorough(db, callback) {
	db.collection('restaurants').distinct("borough", function(err,doc) {
		console.log(doc);
		boroughs = doc;
		callback();
	});
}

function findByBorough(res,req) {
	MongoClient.connect(mongourl, function(err, db) {
			assert.equal(null, err);
			findDistinctBorough(db, function() {
				db.close();
				res.writeHead(200, {"Content-Type": "text/html"});
				//res.write(JSON.stringify(boroughs));
				res.write("<html><body>");
				res.write("<form action=\"/read\" method=\"get\">");
				res.write("Borough: ");
				res.write("<select name=\"borough\">");
				for (i in boroughs) {
					res.write("<option value=\"" +
						boroughs[i] + "\">" + boroughs[i] + "</option>");
				}
				res.write("</select>");
				res.write("<input type=\"submit\" value=\"Search\">");
				res.write("</form>");
				res.write("</body></html>");
				res.end();
				var today = new Date();
				console.log(today.toTimeString() + " " + "CLOSED CONNECTION "
										+ req.connection.remoteAddress);
			});
	});
}

server.listen(process.env.PORT || 8099);
