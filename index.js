const app = require('./bootstrap/app');
const debug = require('debug')(`${app.get('tag')}:server`);
const http = require('http');

const server = http.createServer(app);

server.on('error', err => {
    if (err.syscall === 'listen') {
        const bind =
            typeof app.get('port') === 'string'
                ? 'Pipe ' + app.get('port')
                : 'Port ' + app.get('port');

        // handle specific listen errors with friendly messages
        switch (err.code) {
        case 'EACCES':
            debug(`${bind} requires elevated privileges`);
            break;
        case 'EADDRINUSE':
            debug(`${bind} is already in use`);
            break;
        default:
            debug(err);
            break;
        }
    } else {
        debug(err);
    }

    process.exit(1);
});

server.on('listening', () => {
    const addr = server.address();
    const bind =
        typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
    debug('Listening on ' + bind);
});

server.listen(app.get('port'), app.get('host'));
