console.clear();
const process = require('process');
// process.env.NODE_ENV = 'production';
require('dotenv').config({ path: './.env.' + (process.env.NODE_ENV || 'development') });
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

process.on('uncaughtException', function (exception) {
	console.error(exception);
});
process.on('unhandledRejection', function (reason) {
	console.error(reason);
});

const listenerAPP = require('./app');
const { logger } = require('./src/services');
const http = require('http');

// Clear tmp folder
const fs = require('fs');

function deleteFolderRecursive(path) {
	if (fs.existsSync(path)) {
		fs.readdirSync(path).forEach(function (file) {
			var curPath = path + '/' + file;
			if (fs.lstatSync(curPath).isDirectory()) {
				// recurse
				deleteFolderRecursive(curPath);
			} else {
				// delete file
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(path);
	}
}

let path = './.tmp';
if (fs.existsSync(path)) {
	deleteFolderRecursive(path);
} else {
	fs.mkdirSync(path);
}

// HTTP Server
const server = http.createServer(listenerAPP);

server.addListener('listening', () => {
	logger.info(`Server: \x1b[32m\x1b[1m PORT: ${process.env.PORT} \x1b[0m || \x1b[32m\x1b[1m NODE_ENV: ${process.env.NODE_ENV || '\x1b[31m\x1b[1m NODE_ENV NOT FOUND'} \x1b[0m`);
});
server.listen(process.env.PORT);
