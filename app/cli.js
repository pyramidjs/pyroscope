/*eslint no-console: off*/
const program = require('commander');
const chalk = require('chalk');

program
    .version('0.1.0')
    .option('-e, --env <environment>', 'set environment', 'development');

program
    .command('config:show')
    .description('show config')
    .action(env)
    .action(show);

program
    .command('db:status')
    .description('show migration status')
    .action(env)
    .action(wrap(status));

program
    .command('db:migrate')
    .description('run migrations')
    .action(env)
    .action(wrap(migrate));

program
    .command('db:rollback')
    .description('rollback migrations')
    .action(env)
    .action(wrap(rollback));

program
    .command('db:seed')
    .description('run seeds')
    .action(env)
    .action(wrap(seed));

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

function show() {
    const config = require('@pyramid/configure');
    const util = require('util');
    delete config.__;
    console.log(util.inspect(config, false, null, true));
}

async function status() {
    const config = require('@pyramid/configure');
    const knex = require('knex')(config.database);
    const version = await knex.migrate.currentVersion();
    await knex.destroy();
    console.log(version);
}

async function migrate() {
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

async function seed() {
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

async function rollback() {
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
