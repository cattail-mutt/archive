(function (global) {
    'use strict';

    async function readStream(reader, textDecoder, onChunk) {
        let partial = '';
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    return partial;
                }
                const chunkText = textDecoder.decode(value, { stream: true });
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
     * 向聊天接口发送请求
     * 使用油猴 API `GM_xmlhttpRequest` 代替 `fetch`
     * @param {Object} options - 请求参数，必须包含：
     *   - endpoint: 请求地址
     *   - model: 模型
     *   - apiKey: API 密钥
     *   - messages: 聊天消息数组
     *  其他可选参数（如 temperature 等）也可传入，会合并到请求的 payload 中
     * @param {Function} onChunk - 每个数据块的回调
     * @returns {Promise<string>} 解析完成后的最终文本
     */
    function chatCompletion({ endpoint, model, apiKey, messages, ...restOptions }, onChunk) {
        const payload = {
            model: model,
            messages: messages,
            stream: true,
            ...restOptions
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
                onloadstart: function (response) {
                    (async () => {
                        try {
                            const reader = response.response.getReader();
                            const textDecoder = new TextDecoder();
                            const result = await readStream(reader, textDecoder, onChunk);
                            resolve(result);
                        } catch (error) {
                            reject(error);
                        }
                    })();
                },
                onerror: function (error) {
                    reject(new Error(`请求失败: ${error}`));
                }
            });
        });
    }

    // 暴露到全局，供其他脚本调用
    global.chatCompletion = chatCompletion;
})(this);
