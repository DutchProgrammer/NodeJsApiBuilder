'use strict';

var fs              = require('fs');
var mysql           = require('mysql');
var apiEndpoints    = '/../apiEndpoints';
var acceptedFormats = ['text/html', 'application/json', 'text/json', 'application/xml', 'text/xml'];
var urlParser       = require('url');
var connected       = false;

var mysqlConnectionData = {
	host     : 'localhost',
	port		 : 3306,
	user     : 'username',
	password : 'password',
	database : 'database',
	//localAddress: '127.0.0.1',
	//charset  : 'UTF8_GENERAL_CI',
	//supportBigNumbers: true,
	socketPath : '/var/lib/mysql/mysql.sock',
  connectionLimit: 50,
  queueLimit: 0,
  waitForConnection: true,
	debug 	 : false
};

var api = function api() {

	var getRequestAccept = function get (header) {

		header = header.split(',')[0];
		if (acceptedFormats.indexOf(header) === -1) {
			return 'unkown';
		}

		return header;
	};
	
	var getParamGet = function getParams (url) {
		var url_parts = urlParser.parse(url, true);

		return url_parts.query;
	};

	var getParamPost = function postParams (postParams) {
		return postParams;
	};

	var createJsonResponse = function createJsonResponse(data) {
		if (typeof data !== 'object') {
			data = [data];	
		}

		return JSON.stringify(data);
	};

	var createHtmlResponse = function createHtmlResponse(data) {

		if (typeof data !== 'object') {
			return data;
		}

		var html  = '<table>';
		var thead = '';
		var tbody = '';
		Object.keys(data).forEach(function(item) {
			thead += '<th>'+item+'</th>';

			tbody += '<td>'+data[item]+'</td>';
		});

		html += '<thead><tr>'+thead+'</tr></thead>';
		html += '<tbody><tr>'+tbody+'</tr></tbody>';
		html += '</table>';

		return html;
	};

	var createXmlResponse = function createXmlResponse(data, endPoint, apiFunction) {

		if (typeof data !== 'object') {
			return data;
		}

		var xml = '<?xml version="1.0" encoding="utf-8"?>';

		xml += '<api>';
		xml += '<'+endPoint+'>';
		xml += '<'+apiFunction+'>';

		Object.keys(data).forEach(function(item) {

			if (typeof data[item] === 'object') {
				xml += '<'+item+'>';
				Object.keys(data[item]).forEach(function(item2) { 
					xml += '<'+item2+'>'+data[item][item2]+'</'+item2+'>';
				});
				xml += '<'+item+'>';
			} else {
				xml += '<'+item+'>'+data[item]+'</'+item+'>';
			}
		});

		xml += '</'+apiFunction+'>';
		xml += '</'+endPoint+'>';
		xml += '</api>';

		return xml;
	};

	var parseResponse = function parseResponse(apiReponse, endPoint, apiFunction, reponsonseHeader) {

		var response = {'header' : {'Content-Type': 'text/html'}, 'statusCode' : 200, 'data' : ''};

		switch (reponsonseHeader) {
			case 'text/json':
			case 'application/json':
				response['header']['Content-Type'] = 'application/json';

				response['data'] = createJsonResponse(apiReponse, endPoint, apiFunction);
			break;
			case 'text/xml':
			case 'application/xml':
				response['header']['Content-Type'] = 'application/xml';

				response['data'] = createXmlResponse(apiReponse, endPoint, apiFunction);
			break;
			default:
				response['header']['Content-Type'] = 'text/html';

				response['data'] = createHtmlResponse(apiReponse, endPoint, apiFunction);
			break;
		}

		return response;
	};

	this.request = function request(url, req, res) {
		try {
			url = url.toLowerCase();

			var urlSplit         = url.split('/');
			var endPoint         = urlSplit[1];
			var apiFunction      = urlSplit[2];
			
			var apiFilename      = __dirname+apiEndpoints+'/'+endPoint+'.js';
			var reponsonseHeader = getRequestAccept(req.headers.accept);

			if (reponsonseHeader === 'unkown') {
				throw 'unkown header';
			}

			fs.exists(apiFilename, function (exists) {
				if (!exists) {
					res.writeHead(404, {'Content-Type': 'text/html'});
					res.write('No existing endpoint - check our documentation for more info');
					res.end();
					return;
				}

				var apiEndPoint = require(apiFilename);

				if (typeof apiEndPoint[apiFunction] !== 'function') {
					res.writeHead(404, {'Content-Type': 'text/html'});
					res.write('Not an existing function - check our documentation for more info');
					res.end();
					return;
				}

				var connection = mysql.createConnection(mysqlConnectionData);
				connection.connect(function(err) {
				  if (err) {
				    console.error('error connecting: '+err.stack);
				    return;
				  }
				 
				  console.log('connected as id '+connection.threadId);

					var getParams  = getParamGet(req.url);
					var postParams = getParamPost(request.body);
					
					var response   = parseResponse(apiEndPoint[apiFunction](connection, getParams, postParams), endPoint, apiFunction, reponsonseHeader);
					
					connection.end();

					res.writeHead(response.statusCode, response.header);
					res.write(response.data);
					res.end();
				});
			});

		} catch (err) {
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write('ERROR: '+err);
			res.end();
		}
	};
};

module.exports = (new api());