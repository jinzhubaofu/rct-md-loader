# rct-md-loader

## setup

```sh
npm install -D rct-md-loader
```

## usage

### Webpack 配置

在你的 webpack 配置中为 `.md` 类型文件添加以下配置：

```js
{
    test: /\.md$/,
    use: [
        // 由于 rct-md-loader 会将 md 文件转成一个 react 组件，因此需要对它再次使用一个 babel-loader 进行处理
        {
            loader: 'babel-loader'
        },
        {
            loader: 'rct-md-loader',
            options: {
                // 对 md 中的可运行 demo 进行配置
                codeBlock: {
                    // 可运行 demo 只有一个要求需要返回一个 react 组件，其他的是不限制的。
                    // 因此为了保证这个 demo 能被正确的转译，可以通过指定它的 loader。
                    loader: 'babel-loader',
                    // 可运行 demo 的默认属性
                    props: {
                        className: 'markdown-body'
                    }
                },
                // 以下两个属性是供 `markdown-it` 使用的参数，与 `markdown-it` 的 options 一致。
                preset: 'default'
                use: []
            }
        }
    ]
}
```

### markdown 文档的扩展

#### 嵌入组件

我们可以在 markdown 中直接嵌入某些 React 组件。但受到 `markdown` 语法的限制，没办法提供完事的 jsx 功能。你只可以这样使用组件：

```md
## 一个标题

<MyTestComponent name="test" />
```

所有使用 jsx 中的 `{}` 都是不支持的。例如下边这种就不行：

```md
## 一个标题

<MyTestComponent
    name="test"
    age={10}
    onClick={() => alert()} />
```

#### 可运行代码块

`rct-md-loader` 支持在 `markdown` 文件中添加可运行的 demo。可运行的 demo 的语法是基于代码块的：以 **```react 标题**为起始，以 **```** 为结束。

```md

## 标题

一些描述文字，下边是示例：

\`\`\`react 可运行文档的标题
import React from 'react';
export default () => {
    return (
        <div>这里是一个可以运行的demo</div>
    );
}
\`\`\`
```

这里 **```react** 表示这个代码块输出的是一个 react 组件；**标题** 是额外提供的 meta 信息，可以用来生成提示或者锚点。

> 标题是必须添加的，否则会被当成普通代码块处理。

### 在 js 中使用 markdown 文档

接下来就可以在代码里边使用 `.md` 文件了：

```js
import MyDoc from './Test.md';
import React from 'react';
import ReactDOM from 'react-dom';

function MyCodeBlock(props) {
    let {title, content, children} = props;
    return (
        <div>
            <h4>{title}</h4>
            <pre><code>{content}</code></pre>
            <div>{children}</div>
        </div>
    );
}

function MyTestComponent() {
    return (<div>my test</div>);
}

ReactDOM.render(
    <MyDoc ReactCodeBlock={MyCodeBlock} MyTestComponent={} />,
    document.getElementById('app')
);
```

请注意两种情况：

1. 如果使用了嵌入组件，则必须为 markdown 组件提供相应的属性。

    上边的示例中的 `MyTestComponent` 会被在 markdown 文件中被渲染出来。

2. 如果使用了可运行代码块，那么必须提供一个 `ReactCodeBlock` 的属性。

    这个属性需要是一个 React 组件。这个组件主要是用来展现可运行代码块的源码的。它会得到 `title`、`content`、`children` 三个属性，分别是`标题`、`代码块源代码`和`可运行代码块vnode`。

    > 请注意：content 属性为了保持 jsx 中的 \\n，因此对它做了 JSON.stringify 操作，需要对它进行一次解析
    >
    > 例如：
    > content = JSON.parse('{"content":"' + content + '"}').content;

### 开发

解决方案：

1. 使用 markdown-it 将 markdown 文档渲染成 html

    其中，我们添加了对可运行代码块的语法扩展插件，会把可运行代码块渲染成一个嵌入组件 `<ReactDemoCodeBlock />`。

2. 把上一步生成的 html 解析成 ast，利用自定义的序列化过程将 ast 转成 jsx

    在这个过程中，我们会所有嵌入组件收集起来，也就是类似 `<Text>`（`<<ReactDemoCodeBlock>`也包含在内）

3. 最后把 jsx 生成为一个 react 组件。

    这里会把上一步收集到的嵌入组件生成为依赖。分两类：

    1. 普通嵌入组件：这种依赖需要通过 props 传递进来，在 propTypes 中标识它为 required，并在 render 中把它从 props 给提取出来。
    2. 可运行代码块：

        这个为成两层：`<ReactDemoCodeBlock/>` 和真实的代码内部的组件。前者是渲染的外层容器，通过 props 传递进来的。后者是生成出来的。

        对于可运行代码块内部的代码，我们要求它是一个 js 文件，并且输出一个react组件。所以，实际上这就是一个标准的 js 模块，只不过它隐藏在 markdown 文档中。

        所以我们的 markdown 可以解析出多个模块：除了主模块是文档模块，还有多个可运行代码块模块。即解析的结果是：

        ```js
        {
            main: '主文档模块',
            1: '可运行代码块1',
            2: '可运行代码块2'
            // ...
        }
        ```

        因此，它们之间的关系则为：主模块引入了这些可运行代码块模块。这种情况我们可以通过 webpack 的 loader 参数来区别 main 和可运行代码块。

        所以我们给主模块添加依赖 `import ReactCodeBlock_1 from '!!rct-md-loader?id=1!/path/to/markdown.md';`

        > 这里示意的 loader string 是不完整的，还要加上 codeBlock.loader 指定的前缀

        最后在主文档生成 jsx 时，把 `ReactCodeBlock_1` 填给 `ReactDemoCodeBlock` 当作 children 使用即可。
