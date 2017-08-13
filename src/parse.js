/**
 * @file parse
 * @author leon <ludafa@outlook.com>
 */

const {Parser, DomHandler} = require('htmlparser2');
const {isTag} = require('domelementtype');
const {replaceElement, appendChild} = require('domutils');
const {CODE_BLOCK_COMPONENT_NAME} = require('./constant');
const serialize = require('./dom-serializer');
const loaderUtils = require('loader-utils');
const unescape = require('lodash.unescape');

function traversal(root, handle) {

    let stack = [root];

    while (stack.length) {

        let node = stack.pop();

        if (handle(node) === false) {
            continue;
        }

        if (node.children && node.children.length) {
            stack.push(...node.children);
        }

    }

}

function generateCodeBlock(node, index) {

    return Object.assign(
        {},
        node,
        {
            children: [
                {
                    type: 'tag',
                    name: `ReactDemo_${index}`,
                    attribs: {},
                    children: []
                }
            ]
        }
    );

}

function stringifyLoaders(loaders) {
    return loaders
        .map(obj => (
            obj && typeof obj === 'object' && typeof obj.loader === 'string'
                ? obj.loader + (obj.options ? '?' + JSON.stringify(obj.options) : '')
                : obj
        ))
        .join('!');
}

function generate(dom, {codeBlock}, context) {

    let components = [];
    let codeBlocks = [];
    let {rootTag = 'div', props = {}, loader} = codeBlock;

    let root = {
        type: 'tag',
        name: rootTag,
        attribs: props,
        children: []
    };

    for (let node of dom) {
        appendChild(root, node);
    }

    traversal(root, node => {

        if (!isTag(node)) {
            return;
        }

        if (node.attribs.class) {
            node.attribs.className = node.attribs.class;
            delete node.attribs.class;
        }

        if (node.name === CODE_BLOCK_COMPONENT_NAME) {
            let newNode = generateCodeBlock(node, codeBlocks.length);
            replaceElement(node, newNode);
            codeBlocks.push(node);
            return false;
        }

        if (node.name === 'code' && node.parent && node.parent.name === 'pre') {
            node.parent.attribs.className = 'hljs';
        }

        if (/[A-Z]/.test(node.name.charAt(0))) {
            components.push(node);
        }

    });

    let jsx = serialize(root);
    let codeBlockImports = codeBlocks.map((block, index) => {
        let loaders = stringifyLoaders(Array.isArray(loader) ? loader : [loader]);
        let modulePath = loaderUtils.stringifyRequest(
            context,
            `!!${loaders}!rct-md-loader?id=${index}!${context.resource}?id=${index}`
        );
        return `import ReactDemo_${index} from ${modulePath};`;
    });

    let main = `\
${codeBlockImports.join('\n')}
import React from 'react';
import PropTypes from 'prop-types';
export default function ReactMarkdown(props) {
    ${codeBlocks.length ? `let ${CODE_BLOCK_COMPONENT_NAME} = props.${CODE_BLOCK_COMPONENT_NAME};` : ''}
    ${components.map(node => `const ${node.name} = props.${node.name};`).join('\n')}
    return (${jsx});
}
ReactMarkdown.defaultProps = ${JSON.stringify(props)};
ReactMarkdown.propTypes = {
    ${codeBlocks.length ? `"${CODE_BLOCK_COMPONENT_NAME}": PropTypes.func.isRequired,` : ''}
    ${components.map(node => `"${node.name}": PropTypes.func.isRequired`).join(',\n')}
};
`;

    return codeBlocks.reduce(
        (result, codeBlock, index) => {
            let content = unescape(codeBlock.attribs.content);
            result[index] = JSON.parse(`{"content": "${content}"}`).content;
            return result;
        },
        {main}
    );

}

module.exports = function (html, options, context) {

    let result;
    let error;

    let parseHandler = new DomHandler(function (e, dom) {

        if (e) {
            error = e;
            return;
        }

        result = generate(dom, options, context);

    }, {
        normalizeWhitespace: false
    });

    let parser = new Parser(
        parseHandler,
        {
            // 保留属性名的大小写
            lowerCaseAttributeNames: false,
            // 打开自定义标签的自闭合
            recognizeSelfClosing: true,
            // 保留标签大小写
            lowerCaseTags: false
        }
    );

    parser.write(html);
    parser.end();

    if (error) {
        throw error;
    }

    return result;

};
