module.exports = {
    name: '/',

    index: {
        name: '/',
        method: 'get',
        handler(req, res) {
            res.render('home');
        }
    }
};
