/*eslint no-console: off*/
const program = require('commander');
const chalk = require('chalk');

program
    .version('0.1.0')
    .option('-e, --env <environment>', 'set environment', 'development')
    .option('-w, --wrokdir <dir>', 'change work directory')
    .option('--debug <tag>', 'debug tag');

program
    .command('config:show')
    .description('show config')
    .action(env)
    .action(config_show);

program
    .command('db:status')
    .description('show migration status')
    .action(env)
    .action(wrap(db_status));

program
    .command('db:migrate')
    .description('run migrations')
    .action(env)
    .action(wrap(db_migrate));

program
    .command('db:rollback')
    .description('rollback migrations')
    .action(env)
    .action(wrap(db_rollback));

program
    .command('db:seed')
    .description('run seeds')
    .action(env)
    .action(wrap(db_seed));

program
    .command('cache:keys')
    .description('show cached keys')
    .action(env)
    .action(wrap(cache_keys));

program
    .command('cache:get <key>')
    .description('get cache value by key')
    .action(env)
    .action(wrap(cache_get));

program
    .command('cache:set <key> <value>')
    .description('set cache value')
    .action(env)
    .action(wrap(cache_set));

program
    .command('cache:del <key>')
    .description('delete cache value by key')
    .action(env)
    .action(wrap(cache_del));

program
    .command('cache:flush')
    .description('flush cache')
    .action(env)
    .action(wrap(cache_flush));

program
    .command('make <migration|seed> <name>')
    .description('generate migration/seed file')
    .action(env)
    .action(wrap(make));

program.parse(process.argv);

function env() {
    if (program.env) {
        process.env.NODE_ENV = program.env;
    }
    if (program.debug) {
        process.env.DEBUG = program.debug;
    }
    if (program.wrokdir) {
        process.chdir(program.wrokdir);
        console.log(
            chalk.yellow(
                `workdir changed to ${chalk.bold(chalk.blue(process.cwd()))}`
            )
        );
    }
    console.log(
        chalk.yellow(
            `running in ${chalk.bold(chalk.blue(process.env.NODE_ENV))} mode`
        )
    );
}

function wrap(func) {
    return async (...args) => {
        try {
            await func(...args);
        } catch (error) {
            const util = require('util');
            console.error(chalk.red(util.inspect(error, false, null, true)));
        }
    };
}

function config_show() {
    const config = require('@pyramid/configure');
    const util = require('util');
    delete config.__;
    console.log(util.inspect(config, false, null, true));
}

async function db_status() {
    const config = require('@pyramid/configure');
    const knex = require('knex')(config.database);
    const version = await knex.migrate.currentVersion();
    await knex.destroy();
    console.log(version);
}

async function db_migrate() {
    const config = require('@pyramid/configure');
    const knex = require('knex')(config.database);

    const [, files] = await knex.migrate.latest();
    await knex.destroy();
    if (files.length > 0) {
        console.log(chalk.green(files.join('\n')));
    } else {
        console.log(chalk.yellow('nothing to migrate'));
    }
}

async function db_seed() {
    const config = require('@pyramid/configure');
    const knex = require('knex')(config.database);
    const [files] = await knex.seed.run();
    await knex.destroy();
    if (files.length > 0) {
        console.log(chalk.green(files.join('\n')));
    } else {
        console.log(chalk.yellow('nothing to seed'));
    }
}

async function db_rollback() {
    const config = require('@pyramid/configure');
    const knex = require('knex')(config.database);
    const [, files] = await knex.migrate.rollback();
    await knex.destroy();
    if (files.length > 0) {
        console.log(chalk.blue(files.join('\n')));
    } else {
        console.log(chalk.yellow('nothing to rollback'));
    }
}

async function cache_keys() {
    const config = require('@pyramid/configure');
    const cache = require('./cache')(config.cache);
    const keys = await cache.keys();
    await cache.close();
    if (keys.length > 0) {
        console.log(keys.join('\n'));
    }
}

async function cache_get(key) {
    const config = require('@pyramid/configure');
    const cache = require('./cache')(config.cache);
    const value = await cache.get(key);
    await cache.close();
    console.log(value);
}

async function cache_set(key, value) {
    const config = require('@pyramid/configure');
    const cache = require('./cache')(config.cache);
    await cache.set(key, value);
    await cache.close();
}

async function cache_del(key) {
    const config = require('@pyramid/configure');
    const cache = require('./cache')(config.cache);
    await cache.del(key);
    await cache.close();
}

async function cache_flush() {
    const config = require('@pyramid/configure');
    const cache = require('./cache')(config.cache);
    await cache.flush();
    await cache.close();
}

async function make(type, name) {
    switch (type) {
    case 'migration': {
        const config = require('@pyramid/configure');
        const knex = require('knex')(config.database);
        const inflection = require('inflection');
        const file = await knex.migrate.make(inflection.underscore(name));
        await knex.destroy();
        console.log(chalk.green(file));
        break;
    }
    case 'seed': {
        const config = require('@pyramid/configure');
        const knex = require('knex')(config.database);
        const inflection = require('inflection');
        const file = await knex.seed.make(inflection.underscore(name));
        await knex.destroy();
        console.log(chalk.green(file));
        break;
    }
    default:
        console.error(chalk.red('unknown type'));
    }
}
