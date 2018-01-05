const fs = require('fs');
const path = require('path');
const Vue = require('vue');
const renderer = require('vue-server-renderer').createRenderer();

module.exports = {
    express(app, engine) {
        app.engine(engine, (filePath, options, callback) => {
            fs.readFile(filePath, 'utf8', (err, content) => {
                if (err) {
                    callback(err);
                } else {
                    if (options.components) {
                        Object.keys(options.components).forEach(key => {
                            if (typeof options.components[key] === 'string') {
                                options.components[key] = require(path.resolve(
                                    options.settings.views,
                                    'components',
                                    options.components[key]
                                ));
                            }
                        });
                    }
                    delete options.settings;
                    const app = new Vue(
                        Object.assign({ template: content }, options)
                    );
                    renderer.renderToString(app, callback);
                }
            });
        });
    }
};
