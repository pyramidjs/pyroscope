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

function replace(text, context, settings) {
    const lp = settings.lp;
    const rp = settings.rp;

    return text.replace(/\{\{([^{}]+)\}\}/g, (match, capture) => {
        try {
            return vm.runInContext(unescape(capture), context);
        } catch (err) {
            debug(err);

            return match;
        }
    });
}

function compile(html, options, settings) {
    const dom = cheerio.load(html);
    const prefix = (settings && settings.prefix) || 'ps';
    const lp = (settings && settings.lp) || '{{';
    const rp = (settings && settings.rp) || '}}';

    return traverse(dom.root(), options, { prefix, lp, rp }).html();
}

function traverse(html, options, settings) {
    const context = vm.createContext(options);
    const $ = cheerio(html);
    const prefix = settings.prefix;

    if ($.attr(`${prefix}-if`)) {
        try {
            const res = vm.runInContext($.attr(`${prefix}-if`), context);
            if (!res) {
                $.remove();
                $.next(`*[${prefix}-else]`).removeAttr(`${prefix}-else`);

                return $;
            }
            $.removeAttr(`${prefix}-if`);
            $.next(`*[${prefix}-else]`).remove();
        } catch (error) {
            debug(error);
        }
    }
    if ($.attr(`${prefix}-for`)) {
        const val = $.attr(`${prefix}-for`);
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
                        const child = traverse(
                            temp,
                            {
                                [name]: v,
                                $index: i,
                                $parent: options
                            },
                            settings
                        );
                        $.append(child);
                    });
                    $.removeAttr(`${prefix}-for`);
                }
            } catch (error) {
                debug(error);
            }
        }
    } else {
        $.children().each((i, e) => {
            cheerio(e).html(traverse(e, options, settings).html());
        });
    }

    // if ($.html()) {
    //     $.html(replace($.html(), context, settings));
    // }
    //TODO: li

    return $;
}

module.exports = {
    express(app, engine, settings) {
        app.engine(engine, (filePath, options, callback) => {
            fs.readFile(filePath, 'utf8', (err, content) => {
                if (err) {
                    callback(err);
                } else {
                    try {
                        content = compile(content, options, settings);
                        callback(null, content);
                    } catch (err) {
                        callback(err);
                    }
                }
            });
        });
    }
};
