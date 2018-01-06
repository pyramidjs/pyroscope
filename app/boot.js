const fs = require('fs');
const path = require('path');
const config = require('@pyramid/configure');
const debug = require('debug')(`${config.app.tag}:app`);

module.exports = (app, Router, dir) => {
    fs
        .readdirSync(dir)
        .filter(f => /.js$/.test(f))
        .forEach(name => {
            const file = path.join(dir, name);
            const controller = require(file);
            if (!controller || typeof controller !== 'object') return;
            const location = `/${controller.name ||
                path.basename(file, path.extname(file))}`
                .replace(/\/{2,}/g, '/')
                .replace(/([^/])(\/)$/, '$1')
                .toLowerCase();

            const router = Router(controller.options);
            if (Array.isArray(controller.plugins)) {
                controller.plugins.forEach(plugin => router.use(plugin));
            }
            Object.keys(controller)
                .filter(key => !/^(name|middlewares|plugins)$/.test(key))
                .filter(
                    key =>
                        typeof controller[key] === 'object' &&
                        typeof controller[key].method === 'string' &&
                        /^(get|post|put|delete|patch|head|all)$/i.test(
                            controller[key].method
                        ) &&
                        typeof controller[key].handler === 'function'
                )
                .forEach(key => {
                    let middlewares;
                    const method = controller[key].method.toLowerCase();
                    const handler = controller[key].handler;
                    const url = `/${controller[key].name || key}`
                        .replace(/\/{2,}/g, '/')
                        .replace(/([^/])(\/)$/, '$1')
                        .toLowerCase();
                    middlewares = controller[key].middlewares;
                    if (Array.isArray(controller.middlewares)) {
                        if (Array.isArray(middlewares)) {
                            middlewares = controller.middlewares.concat(
                                middlewares
                            );
                        } else {
                            middlewares = controller.middlewares;
                        }
                    }
                    if (Array.isArray(middlewares)) {
                        router[method](url, ...middlewares, handler);
                    } else {
                        router[method](url, handler);
                    }
                    const uri = `${location}/${url}`
                        .replace(/\/{2,}/g, '/')
                        .replace(/([^/])(\/)$/, '$1');
                    debug(`mounted route ${method.toUpperCase()} ${uri}`);
                });

            app.use(location, router);
        });
};
