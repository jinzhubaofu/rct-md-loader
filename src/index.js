/**
 * @file webpack loader to load a markdown file as react component
 * @author leon <ludafa@outlook.com>
 */

const loaderUtils = require('loader-utils');
const markdown = require('./markdown');
const parse = require('./parse');
const LRU = require('lru-cache');
const hashSum = require('hash-sum');

const cache = new LRU({max: 100});

module.exports = function (source) {

    let callback = this.async();
    let resourcePath = this.resourcePath;
    let hash = hashSum(source);
    let cacheKey = `${resourcePath}|${hash}`;

    let options = Object.assign(
        {
            codeBlock: {
                props: {
                    className: 'markdown'
                },
                loader: 'babel-loader',
                rootTag: 'div'
            }
        },
        loaderUtils.getOptions(this) || {},
        this.reactMarkdown,
        this.options.reactMarkdown,
    );

    let {id = 'main'} = options;

    let cachedParts = cache.get(cacheKey);
    if (cachedParts) {
        callback(null, cachedParts[id]);
        return;
    }

    let code = markdown(options).render(source);
    let parts = parse(code, options, this);

    cache.set(cacheKey, parts);

    callback(null, parts[id]);

};
