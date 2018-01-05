const config = require('@pyramid/configure');
const Router = require('express').Router;
const session = require('express-session');

const router = Router();

router.use(
    session({
        resave: false,
        saveUninitialized: false,
        secret: config.app.secret
    })
);

router.get('/', (req, res) => {
    res.render('hello-world', {
        data: {
            visible: true,
            title: 'Hello World',
            status: 200,
            desc: 'This is a sample page',
            content:
                'Ea omnis delectus a nesciunt nisi dolorem. Qui voluptatem blanditiis odit. Blanditiis molestiae voluptates qui velit aut est dolores velit. Tempore quod ratione corporis autem sit dicta. Nesciunt sit accusantium quae omnis adipisci sed aut nostrum. Tempora delectus et amet sunt adipisci repudiandae consequatur.',
            markup: 'Qui molestiae et asperiores esse.',
            items: ['a', 'b', 'c', 'd']
        },
        filters: {
            capitalize(val) {
                return val.toUpperCase();
            }
        },
        components: {
            'my-component': {
                template: '<div>{{status}}</div>',
                props: ['status']
            },
            child: 'item'
        }
    });
});

module.exports = {
    path: '/',
    router
};
