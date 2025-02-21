(function () {
    /**
     * 读取流式响应数据并在每次收到数据块时调用 onChunk 回调
     * @param {ReadableStreamDefaultReader} reader 
     * @param {TextDecoder} textDecoder 
     * @param {function(string):void} onChunk 
     * @returns {Promise<string>} 完整的响应字符串
     */
    async function readStream(reader, textDecoder, onChunk) {
        let partial = '';
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    return partial;
                }
                const chunkText = textDecoder.decode(value, { stream: true });
                // 按行处理 SSE 格式的响应
                const lines = chunkText.split('\n').filter(line => line.trim());
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const jsonStr = line.replace(/^data: /, '');
                    if (jsonStr === '[DONE]') {
                        return partial;
                    }
                    try {
                        const parsed = JSON.parse(jsonStr);
                        if (parsed.error) {
                            throw new Error(parsed.error.message || '接口返回错误');
                        }
                        const delta = parsed.choices[0].delta.content || '';
                        if (delta) {
                            partial += delta;
                            if (onChunk) onChunk(delta);
                        }
                    } catch (e) {
                        throw new Error(`SSE解析出错: ${e.message}`);
                    }
                }
            }
        } catch (error) {
            throw new Error(`Stream reading failed: ${error.message}`);
        }
    }

    /**
     * 使用油猴 API `GM_xmlhttpRequest` 发起聊天补全请求，参数包括 endpoint、model、apiKey、messages（必传）以及其他可选参数（如 temperature）
     * @param {object} options 
     * @param {string} options.endpoint 请求地址
     * @param {string} options.model 模型名称
     * @param {string} options.apiKey API Key
     * @param {Array} options.messages 消息数组，例如：
     *   [
     *     { role: 'system', content: '...' },
     *     { role: 'user', content: '...' }
     *   ]
     * @param {function(string):void} onChunk 每接收到数据块时调用的回调
     * @param {object} [options.otherParams] 可传入其他参数将会并入请求负载
     * @returns {Promise<string>} 完整响应内容字符串
     */
    function chatCompletion({ endpoint, model, apiKey, messages, ...otherParams }, onChunk) {
        const payload = {
            model: model,
            messages: messages,
            stream: true,
            ...otherParams
        };

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: endpoint,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                data: JSON.stringify(payload),
                responseType: 'stream',
                async onloadstart(response) {
                    try {
                        const reader = response.response.getReader();
                        const textDecoder = new TextDecoder();
                        const result = await readStream(reader, textDecoder, onChunk);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                },
                onerror: (error) => {
                    reject(new Error(`请求失败: ${error}`));
                }
            });
        });
    }
    window.chatCompletion = chatCompletion;
})();
