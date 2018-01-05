const config = require('@pyramid/configure');
process.env.DEBUG = config.app.debug;

const express = require('express');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const debug = require('debug')(`${config.app.tag}:app`);

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
if (config.renderer.engine) {
    const renderer = require(config.renderer.path);
    renderer.express(app, config.renderer.engine);
    app.set('view engine', config.renderer.engine);
    app.set('views', config.path.views);
}

/**
 * static files
 */
if (config.path.public) {
    app.use(express.static(config.path.public));
}

/**
 * Routes
 */
if (config.routes) {
    const mount = require('./mount');
    Object.keys(config.routes).forEach(key => {
        const router = express.Router(config.routes[key].options);
        mount(router, config.routes[key].controllers);
        app.use(key, router);
    });
}

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
