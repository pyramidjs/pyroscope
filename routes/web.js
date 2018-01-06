const config = require('@pyramid/configure');
const session = require('express-session');

module.exports = {
    name: '/',

    plugins: [
        session({
            resave: false,
            saveUninitialized: false,
            secret: config.app.secret
        })
    ],

    index: {
        name: '/',
        method: 'get',
        handler(req, res) {
            res.render('home');
        }
    }
};
