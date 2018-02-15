/**
 * @file markdown
 * @author leon <ludafa@outlook.com>
 */

/* eslint-disable fecs-camelcase, prefer-rest-params, fecs-prefer-destructure, fecs-no-require */

const markdown = require('markdown-it');
const MarkdownItCodeBlock = require('./markdown-it-plugin/CodeBlock');
const prism = require('prismjs');

function renderHighlight(str, lang) {

    try {
        return prism.highlight(str, prism.languages[lang]);
    }
    catch (err) {}

}

module.exports = function (options) {

    options = Object.assign(
        {
            preset: 'default',
            html: true,
            highlight: renderHighlight
        },
        options
    );

    let preset = options.preset;
    let plugins = options.use;

    delete options.preset;
    delete options.use;

    let md = markdown(preset, options);

    if (plugins && plugins.length) {
        plugins.forEach(plugin => {
            if (Array.isArray(plugin)) {
                md.use.apply(md, plugin);
            }
            else {
                md.use(plugin);
            }
        });
    }

    md.use(MarkdownItCodeBlock);

    return md;
};
