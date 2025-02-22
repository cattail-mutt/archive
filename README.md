<h1>archive</h1>

<h2>openai</h2>

<h3>chatCompletion.js</h3>
<p>调用方式:</p>
<pre><code>await window.chatCompletion({
    endpoint: config.endPoint,
    model: config.model,
    apiKey: config.apiKey,
    messages: messages
}, (chunk) => {
    rawText += chunk;
    ...  //其他操作
});
</code></pre>
<p>说明：</p>
<p>  1. 请注意在脚本头部的元数据部分声明：</p>
<pre><code>// @require      https://raw.githubusercontent.com/cattail-mutt/archive/refs/heads/main/openai/chatCompletion.js</code></pre>
<p>  2. 必须传入的参数包括 endpoint, model, apiKey, messages, 此外，还可以传入温度等其他参数。</p>
<p>  2. chunk 是流式响应中的文本消息（片段）的内容，可以通过 `rawText += chunk;` 积累。</p>
