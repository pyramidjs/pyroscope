module.exports = {
    index: {
        name: '/',
        method: 'post',
        handler(req, res) {
            res.json(req.body);
        }
    }
};
