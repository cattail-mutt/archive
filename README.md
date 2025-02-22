<h1>archive</h1>

<h2>openai</h2>
<h3>chatCompletion.js</h3>
<p>调用方式：</p>
<pre><code>...  // 其他代码
let rawText = '';
...  // 触发操作
rawText = '';
try {
    const result = await window.chatCompletion({
        endpoint: endPoint,
        apiKey: apiKey,
        model: model,
        messages: messages
        ...  //其他参数, 如`temperature: 2`
    }, (chunk) => {
        console.log('实时消息：', chunk);
        rawText += chunk;
        ...  //其他操作，比如在 "&lt;pre&gt;&lt;code&gt;&lt;/code&gt;&lt;/pre&gt;" 中实时显示消息内容，即 "rawText" 的值
    });
    ...  //其他操作
} catch (error) {
    console.error('错误：', error.message);
}
</code></pre>
<p>说明：</p>
<p>  1. 请注意在脚本头部的元数据部分声明：</p>
<pre><code>// @grant        GM_xmlhttpRequest
// @require      https://raw.githubusercontent.com/cattail-mutt/archive/refs/heads/main/openai/chatCompletion.js
</code></pre>
<p>  2. 必须传入的参数包括 endPoint, apiKey, model, messages, 此外，还可以传入温度等其他参数。</p>
<p>  3. chunk 是流式响应中的文本消息（片段）的内容，可以通过 `rawText += chunk;` 累积。</p>
<p>  4. result 是最终完整的文本消息的内容。</p>
<p>  5. 如果 API 返回错误，将会在控制台中简短地汇报错误信息，如："错误： HTTP error! status: 401"</p>
