const config = require('@pyramid/configure');
process.env.DEBUG = config.app.debug;
require('./globals');

const express = require('express');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const debug = require('debug')(`${config.app.tag}:bootstrap`);
const renderer = require('../framework/renderer');

const app = express();

app.set('tag', config.app.tag);
app.set('host', config.app.host);
app.set('port', config.app.port);

/**
 * set request logger
 */
app.use(morgan('dev', { stream: { write: debug } }));

/**
 * body parser
 */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

/**
 * view engine
 */
renderer.express(app, 'html');
app.set('view engine', 'html');
app.set('views', path.resolve(__dirname, '../resources/views'));

/**
 * static files
 */
app.use(express.static(path.resolve(__dirname, '../public')));

/**
 * Routes
 */
fs
    .readdirSync(path.resolve(__dirname, '../routes'))
    .filter(f => /.js$/.test(f))
    .forEach(name => {
        const filename = path.resolve(__dirname, '../routes', name);
        const route = require(filename);
        if (
            route &&
            typeof route.path === 'string' &&
            typeof route.router === 'function'
        ) {
            app.use(route.path, route.router);
            debug(`mounted router at ${route.path}`);
        }
    });

/**
 * catch 404 and forward to error handler
 */
app.use((req, res, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/**
 * error handler
 */
/* eslint no-unused-vars: off */
app.use((err, req, res, next) => {
    // set http status
    res.status(err.status || 500);

    // send error
    res.json({
        error: err.status || 500,
        message: err.message
    });

    // bypass 4xx errors
    if (!err.status || !/^(4[0-9]{2}|503)$/.test(err.status)) debug(err);
});

module.exports = app;
