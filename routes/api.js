module.exports = {
    name: '/api/v1',

    index: {
        name: '/',
        method: 'post',
        handler(req, res) {
            res.json(req.body);
        }
    }
};
