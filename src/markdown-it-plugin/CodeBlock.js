/**
 * @file SanComponentCodeBlock
 * @author leon <ludafa@outlook.com>
 */

/* eslint-disable fecs-no-require */

const markdownitfence = require('./fence');
const {CODE_BLOCK_COMPONENT_NAME, CODE_BLOCK_PREFIX} = require('../constant');
const escape = require('lodash.escape');

function resolveFenceData(fence) {

    fence = fence.trim();

    let reg = new RegExp(`^(${CODE_BLOCK_PREFIX}) (.+)`);
    let match = reg.exec(fence.trim());

    if (!match) {
        return;
    }

    let [, prefix, title] = match;

    return {
        prefix,
        title
    };

}

module.exports = function (md) {

    return markdownitfence(md, CODE_BLOCK_COMPONENT_NAME, {
        validate(params) {
            let match = resolveFenceData(params);
            return match && match.prefix === CODE_BLOCK_PREFIX && match.title;
        },
        render(tokens, index, options, env, self) {
            let {info, content} = tokens[index];
            let {title} = resolveFenceData(info);
            let escapedContent = escape(JSON.stringify(content).slice(1, -1));
            return `<${CODE_BLOCK_COMPONENT_NAME} title="${title}" content="${escapedContent}" />`;
        }
    });

};
