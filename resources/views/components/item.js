module.exports = {
    props: ['message'],
    template: '<span>{{ message | duplicate }}</span>',
    filters: {
        duplicate(val) {
            return Array(3)
                .fill(val)
                .join();
        }
    }
};
