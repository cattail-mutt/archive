(function () {
    async function readStream(reader, textDecoder, onChunk) {
        let buffer = '';
        let fullResponse = '';
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    return fullResponse;
                }
                const chunkText = textDecoder.decode(value, { stream: true });
                buffer += chunkText;

                let newlineIndex;
                while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                    const line = buffer.substring(0, newlineIndex).trim();
                    buffer = buffer.substring(newlineIndex + 1);

                    if (!line) continue; 

                    if (line.startsWith('data: ')) {
                        const jsonStr = line.replace(/^data: /, '');
                        if (jsonStr === '[DONE]') {
                            return fullResponse; 
                        }
                        try {
                            const parsed = JSON.parse(jsonStr);
                            if (parsed.error) {
                                throw new Error(parsed.error.message || '接口返回错误');
                            }
                            const delta = parsed.choices?.[0]?.delta?.content || '';
                            if (delta) {
                                fullResponse += delta;
                                if (onChunk) onChunk(delta);
                            }
                        } catch (e) {
                            console.error(`SSE解析出错于行: "${line}"`, e); 
                            throw new Error(`SSE解析出错: ${e.message} (原始行: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''})`);
                        }
                    } else {
                         // console.log("Ignoring non-data line:", line);
                    }
                }
            }
        } catch (error) {
            throw new Error(`Stream reading failed: ${error.message}`);
        }
    }

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
                onloadstart(response) { 
                    if (response.status < 200 || response.status >= 300) {
                        const reader = response.response?.getReader ? response.response.getReader() : null;
                        if (reader) {
                            const textDecoder = new TextDecoder();
                            reader.read().then(({ done, value }) => {
                                let errorBody = 'No details available.';
                                if (!done && value) {
                                    errorBody = textDecoder.decode(value);
                                }
                                reject(new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`));
                            }).catch(readError => {
                                reject(new Error(`HTTP error! status: ${response.status}. Failed to read error body: ${readError.message}`));
                            });
                        } else {
                            reject(new Error(`HTTP error! status: ${response.status}`));
                        }
                        return;
                    }

                    try {
                        const reader = response.response.getReader();
                        const textDecoder = new TextDecoder();
                        readStream(reader, textDecoder, onChunk)
                            .then(resolve) 
                            .catch(reject); 
                    } catch (error) {
                        reject(new Error(`Failed to start reading stream: ${error.message}`));
                    }
                },
                onerror: (error) => {
                    console.error("GM_xmlhttpRequest error:", error);
                    reject(new Error(`请求失败: ${error.error || 'Unknown GM_xmlhttpRequest error'}`));
                },
                 ontimeout: () => {
                      reject(new Error('请求超时'));
                 }
            });
        });
    }
    window.chatCompletion = chatCompletion;
})();
