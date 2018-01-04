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

function replace(text, context) {
    return text.replace(/\{\{([^{}]+)\}\}/g, (match, capture) => {
        try {
            return vm.runInContext(unescape(capture), context);
        } catch (err) {
            debug(err);

            return match;
        }
    });
}

function compile(html, options) {
    const dom = cheerio.load(html);

    return traverse(dom.root(), options).html();
}

function traverse(html, options) {
    const context = vm.createContext(options);
    const $ = cheerio(html);
    if ($.attr('ps-if')) {
        try {
            const res = vm.runInContext($.attr('ps-if'), context);
            if (!res) {
                $.remove();
                $.next('*[ps-else]').removeAttr('ps-else');

                return $;
            }
            $.removeAttr('ps-if');
            $.next('*[ps-else]').remove();
        } catch (error) {
            debug(error);
        }
    }
    if ($.attr('ps-for')) {
        const val = $.attr('ps-for');
        const args = val.split(/\s+/);
        if (args.length === 3 && /^(in|of)$/.test(args[1])) {
            const name = args[0];
            const exp = args[2];
            try {
                const res = vm.runInContext(exp, context);
                if (Array.isArray(res)) {
                    const temp = $.html();
                    $.children().remove();
                    res.forEach((v, i) => {
                        const child = traverse(temp, {
                            [name]: v,
                            $index: i,
                            $parent: options
                        });
                        $.append(child);
                    });
                    $.removeAttr('ps-for');
                }
            } catch (error) {
                debug(error);
            }
        }
    } else {
        $.children().each((i, e) => {
            cheerio(e).html(traverse(e, options).html());
        });
    }

    // if ($.html()) {
    //     $.html(replace($.html(), context));
    // }
    //TODO: li

    return $;
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