/**
 * @file webpack loader to load a markdown file as react component
 * @author leon <ludafa@outlook.com>
 */

const loaderUtils = require('loader-utils');
const markdown = require('./markdown');
const parse = require('./parse');

module.exports = function (source) {

    let callback = this.async();

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

    // console.log(options);

    let code = markdown(options).render(source);

    let {id = 'main'} = options;

    console.time(this.resource);
    let parts = parse(code, options, this);
    console.timeEnd(this.resource);

    callback(null, parts[id]);

};
