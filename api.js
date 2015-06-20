var express      = require('express');
var app          = express();
var server       = require('http').createServer(app);
var serverPort   = 3000;

var apiHandler   = require('./modules/api.js');

app.get('*', function (req, res) {
	var url = (req.url === '/' ? '/index.html' : req.url).split('?')[0];

	//Dont let them read this file !!
	if (url === '/api.js') {
		res.writeHead(404, {'Content-Type': 'text/html'});
		res.write('404 file not found');
		res.end();
		return;
	}

	return apiHandler.request(url, req, res);
});

server.listen(serverPort, function () {
	console.log('server is running on '+serverPort);
});