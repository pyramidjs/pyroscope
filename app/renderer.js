const fs = require('fs');
const Vue = require('vue');
const renderer = require('vue-server-renderer').createRenderer();

module.exports = {
    express(app, engine) {
        app.engine(engine, (filePath, options, callback) => {
            fs.readFile(filePath, 'utf8', (err, content) => {
                if (err) {
                    callback(err);
                } else {
                    const app = new Vue(
                        Object.assign({ template: content }, options)
                    );
                    renderer.renderToString(app, callback);
                }
            });
        });
    }
};
