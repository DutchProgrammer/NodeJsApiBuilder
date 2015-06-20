'use strict';


var authentication = function authentication() {

	this.gettoken = function gettoken(mysql, getParams, postParams) {

		var username = getParams.username;
		var password = getParams.password;

		return {'id' : '00000', 'token' : '5e37128fs3d5303d82dba1bb5f58b511bcd1810'};
	};
};

module.exports = (new authentication());