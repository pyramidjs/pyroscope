const fs = require('fs');
const cheerio = require('cheerio');
const vm = require('vm');
const debug = require('debug')('pyroscope:renderer');

function unescape(val) {
    return val.replace(/&[a-z]+;/g, (match, capture) => {
        switch (capture) {
        case 'amp':
            return '&';
        case 'apos':
            return '\'';
        case 'lt':
            return '<';
        case 'gt':
            return '>';
        case 'quot':
            return '"';
        default:
            return match;
        }
    });
}

function compile(html, context) {
    const $ = cheerio.load(html);

    $('*[ps-if]').each((i, e) => {
        let res;
        try {
            res = vm.runInNewContext($(e).attr('ps-if'), context);
        } catch (err) {
            debug(err);
            res = false;
        }
        if (!res) {
            $(e)
                .next('*[ps-else]')
                .removeAttr('ps-else');
            $(e).remove();
        } else {
            $(e)
                .next('*[ps-else]')
                .remove();
            $(e).removeAttr('ps-if');
        }
    });

    $('*[ps-for]').each((i, e) => {
        const val = $(e).attr('ps-for');
        const args = val.split(/\s+/);
        if (args.length === 3 && /^(in|of)$/.test(args[1])) {
            const name = args[0];
            const exp = args[2];
            let res;
            try {
                res = vm.runInNewContext(exp, context);
            } catch (err) {
                debug(err);
                res = undefined;
            }
            if (Array.isArray(res)) {
                const temp = $(e).html();
                $(e)
                    .children()
                    .remove();
                res.forEach((v, i) => {
                    $(e).append(
                        compile(temp, {
                            [name]: v,
                            $index: i,
                            $parent: context
                        })
                    );
                });
                $(e).removeAttr('ps-for');
            }
        }
    });

    return $.html().replace(/\{\{([^{}]+)\}\}/g, (match, capture) => {
        try {
            return vm.runInNewContext(unescape(capture), context);
        } catch (err) {
            debug(err);

            return match;
        }
    });
}

module.exports = {
    express(app, engine) {
        app.engine(engine, (filePath, options, callback) => {
            fs.readFile(filePath, 'utf8', (err, content) => {
                if (err) {
                    callback(err);
                } else {
                    try {
                        content = compile(content, options);
                        callback(null, content);
                    } catch (err) {
                        callback(err);
                    }
                }
            });
        });
    }
};
