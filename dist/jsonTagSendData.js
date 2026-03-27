(function(w){
    w.jsonTagSendData = function jsonTagSendData(url, origPayload, enableGzip, dataLayerOptions, sendMethod, cleanPayload, addCommonData, xGtmServerPreviewToken, enableBase64Fallback, batchOptions){
        // helper functions
        const batchStateKey = '__jsonTagBatchState';

        function getBatchState() {
            if (!w[batchStateKey]) {
                w[batchStateKey] = {
                    queues: {}
                };
            }

            return w[batchStateKey];
        }

        function normalizeBatchOptions(batchOptions) {
            const options = batchOptions || {};
            const enabled = options.enabled === false || options.enabled === 'false'
                ? false
                : true;
            const parsedDelay = Number(options.delay);
            const parsedMaxSize = Number(options.maxSize);
            const parsedMaxRetries = Number(options.maxRetries);

            return {
                enabled: enabled,
                delay: Number.isFinite(parsedDelay) && parsedDelay >= 0 ? parsedDelay : 150,
                maxSize: Number.isFinite(parsedMaxSize) && parsedMaxSize > 0 ? Math.floor(parsedMaxSize) : 20,
                maxRetries: Number.isFinite(parsedMaxRetries) && parsedMaxRetries >= 0 ? Math.floor(parsedMaxRetries) : 3
            };
        }

        function getQueueKey(url, enableGzip, dataLayerOptions, sendMethod, xGtmServerPreviewToken, enableBase64Fallback) {
            return JSON.stringify({
                url: url,
                enableGzip: enableGzip,
                dataLayerOptions: dataLayerOptions || null,
                sendMethod: sendMethod || 'fetch',
                xGtmServerPreviewToken: xGtmServerPreviewToken || null,
                enableBase64Fallback: enableBase64Fallback
            });
        }
        function hasValidEndpointUrl(endpointUrl) {
            if (typeof endpointUrl !== 'string') {
                return false;
            }

            const trimmedUrl = endpointUrl.trim();

            if (!trimmedUrl || trimmedUrl === 'undefined' || trimmedUrl === 'null') {
                return false;
            }

            try {
                new URL(trimmedUrl, w.location.href);
                return true;
            } catch (error) {
                return false;
            }
        }
        function addCommonDataToPayload(obj){
            obj.page_location = w.location.href;
            obj.page_path = w.location.pathname;
            obj.page_hostname = w.location.hostname;
            obj.page_referrer = document.referrer;
            obj.page_title = document.title;
            obj.page_encoding = document.characterSet;
            obj.screen_resolution = w.screen && (w.screen.width + 'x' + w.screen.height);
            obj.viewport_size = w.innerWidth && w.innerHeight && (w.innerWidth + 'x' + w.innerHeight);
            obj.language = navigator && navigator.language;

            return obj;
        }
        function cleanEventData(obj) {
            if (Array.isArray(obj)) {
                return obj
                    .map(cleanEventData)
                    .filter(item =>
                        item !== null &&
                        item !== undefined &&
                        item !== '' &&
                        !(typeof item === 'object' && Object.keys(item).length === 0) &&
                        !(typeof item === 'number' && Number.isNaN(item))
                    );
            } else if (typeof obj === 'object' && obj !== null) {
                return Object.fromEntries(
                    Object.entries(obj)
                        .map(([key, value]) => [key, cleanEventData(value)])
                        .filter(([, value]) =>
                            value !== null &&
                            value !== undefined &&
                            value !== '' &&
                            !(typeof value === 'object' && Object.keys(value).length === 0) &&
                            !(typeof value === 'number' && Number.isNaN(value))
                        )
                );
            }
        
            // Primitive case: check if it's NaN
            if (typeof obj === 'number' && Number.isNaN(obj)) {
                return undefined; // or null, or just skip it
            }
        
            return obj;
        }
        function pushResponseToDataLayer(data, dataLayerOptions) {
            if (!dataLayerOptions) return false;

            const { dataLayerName, dataLayerEventName } = dataLayerOptions;
            w[dataLayerName] = w[dataLayerName] || [];

            const eventData = {
                event: dataLayerEventName,
                _clear: true
            };

            // Only attach jsonclient if data has keys
            if (data && Object.keys(data).length > 0) {
                eventData.jsonclient = data;
            }

            w[dataLayerName].push(eventData);
            return true;
        }
        function base64EncodeUtf8(str) {
            const bytes = new TextEncoder().encode(str); // UTF-8 Bytes
            let binary = '';
            bytes.forEach(b => binary += String.fromCharCode(b));
            return btoa(binary);
        }
        async function sendPayload(payload) {
            const isWebKit = /AppleWebKit/i.test(navigator.userAgent) && !/Chrome|OPR|Edge|SamsungBrowser|Android/i.test(navigator.userAgent); // WebKit has issues with compressionStream :/
            const isFetchKeepaliveSupported = 'keepalive' in new Request(''); // see https://gist.github.com/paulcollett/a9294ab8290626cad2e2cee9b45fa1b3
            const isNavigatorSendBeaconSupported = typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function';

            let post_headers = {
                'Content-Type': 'application/json'
            };

            if( xGtmServerPreviewToken ){
                // add X-Gtm-Server-Preview header to the request if a value is found
                post_headers['X-Gtm-Server-Preview'] = xGtmServerPreviewToken;
            }

            const stringifiedPayload = JSON.stringify(payload);

            // define send method based on browser compatibility
            let effectiveSendMethod = sendMethod || 'fetch';

            if (sendMethod === 'sendBeacon') {
                if (isNavigatorSendBeaconSupported) {
                    effectiveSendMethod = 'sendBeacon';
                } else if (isFetchKeepaliveSupported) {
                    effectiveSendMethod = 'fetchKeepalive';
                } else {
                    effectiveSendMethod = 'fetch'; // Fallback
                }
            }

            if( !isWebKit && effectiveSendMethod === 'fetch' && enableGzip && typeof CompressionStream === 'function' ){
                // fetch + gzip
                try {
                    post_headers['Content-Encoding'] = 'gzip';

                    // Convert JSON to Stream
                    const stream = new Blob( [stringifiedPayload], {
                        'type': 'application/json',
                    }).stream();

                    const compressedReadableStream = stream.pipeThrough(new CompressionStream('gzip'));
                    const compressedResponse = new Response(compressedReadableStream);
                    const blob = await compressedResponse.blob();

                    // fetch data
                    const response = await fetch( url, {
                        'method': 'POST',
                        'credentials': 'include',
                        'headers': post_headers,
                        'body': blob // send JSON gzipped
                    });

                    if (!response.ok) {
                        throw new Error('HTTP-Error! Status: ' + response.status);
                    }

                    const data = await response.json();
                    pushResponseToDataLayer(data, dataLayerOptions);
                    return data;
                } catch (error) {
                    console.log(error);
                    return null;
                }
            } else {
                // sendBeacon, fetchKeepalive or fetch without gzip
                const finalPayload = enableGzip && enableBase64Fallback ? base64EncodeUtf8(stringifiedPayload) : stringifiedPayload; // base64 encode can be used as a fallback for gzip to ensure that the payload is not readable and better protected against automatic sql injection attempts
                const endpointUrl = enableGzip && enableBase64Fallback ? url + '/ba' : url; // add /ba suffix to the URL to indicate that the payload is base64 encoded

                if (effectiveSendMethod === 'sendBeacon') {
                    navigator.sendBeacon(endpointUrl, finalPayload);
                    return true;
                } else {
                    // fetch or fetchKeepalive, uncompressed
                    try {
                        let fetchOptions = {
                            'method': 'POST',
                            'credentials': 'include',
                            'body': finalPayload // JSON-Body uncompressed but base64 encoded if gzip option is enabled!
                        };

                        if( effectiveSendMethod === 'fetchKeepalive' ){
                            // add keepalive option if fetch keepalive is selected and supported
                            fetchOptions.keepalive = true;
                            post_headers['X-Keepalive-Request'] = 1;
                        }

                        fetchOptions.headers = post_headers;

                        const response = await fetch( endpointUrl, fetchOptions);

                        if (!response.ok) {
                            throw new Error('HTTP-Error! Status: ' + response.status);
                        }

                        const data = await response.json();
                        pushResponseToDataLayer(data, dataLayerOptions);
                        return data;
                    } catch (error) {
                        console.log(error);
                        return null;
                    }
                }
            }
        }
        function preparePayload(payload) {
            let finalPayload = cleanPayload ? cleanEventData(payload) : payload;
            finalPayload = addCommonData ? addCommonDataToPayload(finalPayload) : finalPayload;
            return finalPayload;
        }
        function normalizeQueueEntry(entry) {
            if (entry && typeof entry === 'object' && Object.prototype.hasOwnProperty.call(entry, 'payload')) {
                const retryCount = Number(entry.retryCount);

                return {
                    payload: entry.payload,
                    retryCount: Number.isFinite(retryCount) && retryCount >= 0 ? Math.floor(retryCount) : 0
                };
            }

            return {
                payload: entry,
                retryCount: 0
            };
        }
        function createQueue(queueKey, options) {
            const state = getBatchState();

            if (!state.queues[queueKey]) {
                state.queues[queueKey] = {
                    items: [],
                    timerId: null,
                    isSending: false,
                    options: options
                };
            } else {
                state.queues[queueKey].options = options;
            }

            return state.queues[queueKey];
        }
        function scheduleFlush(queueKey) {
            const queue = getBatchState().queues[queueKey];

            if (!queue || queue.timerId || queue.isSending) {
                return;
            }

            queue.timerId = w.setTimeout(function() {
                flushQueue(queueKey);
            }, queue.options.delay);
        }
        async function flushQueue(queueKey) {
            const state = getBatchState();
            const queue = state.queues[queueKey];

            if (!queue || queue.isSending || queue.items.length === 0) {
                if (queue) {
                    queue.timerId = null;
                }
                return;
            }

            queue.timerId = null;
            queue.isSending = true;

            const queuedItems = queue.items.splice(0, queue.options.maxSize).map(normalizeQueueEntry);
            const queuedPayloads = queuedItems.map(function(item) {
                return item.payload;
            });
            const payload = queuedPayloads.length === 1 ? queuedPayloads[0] : queuedPayloads;
            const response = await sendPayload(payload);

            queue.isSending = false;

            let shouldScheduleNextFlush = true;

            if (response === null) {
                const failedItems = queuedItems.map(function(item) {
                    return {
                        payload: item.payload,
                        retryCount: item.retryCount + 1
                    };
                });

                queue.items = failedItems.concat(queue.items);

                const reachedRetryLimit = failedItems.some(function(item) {
                    return item.retryCount > queue.options.maxRetries;
                });

                if (reachedRetryLimit) {
                    // Stop timer-based retries to avoid endless loops (e.g. blocked/offline).
                    // The queue will be retried when the next event is added.
                    shouldScheduleNextFlush = false;
                }
            }

            if (queue.items.length > 0 && shouldScheduleNextFlush) {
                scheduleFlush(queueKey);
            }
        }

        if (!hasValidEndpointUrl(url)) {
            console.log('[JSON Tag] Invalid endpoint URL. Please configure a valid endpointHostname and endpointPath in JSON Tag Settings.');
            return false;
        }
        // send data
        (async () => {
            const normalizedBatchOptions = normalizeBatchOptions(batchOptions);
            const requestedSendMethod = sendMethod || 'fetch';
            const shouldBatch = normalizedBatchOptions.enabled && requestedSendMethod === 'fetch';
            const preparedPayload = preparePayload(origPayload);

            if (shouldBatch) {
                const queueKey = getQueueKey(url, enableGzip, dataLayerOptions, sendMethod, xGtmServerPreviewToken, enableBase64Fallback);
                const queue = createQueue(queueKey, normalizedBatchOptions);

                // A newly observed event should reactivate paused queue items.
                queue.items = queue.items.map(normalizeQueueEntry).map(function(item) {
                    if (item.retryCount > queue.options.maxRetries) {
                        return {
                            payload: item.payload,
                            retryCount: 0
                        };
                    }

                    return item;
                });

                queue.items.push({ payload: preparedPayload, retryCount: 0 });

                if (queue.items.length >= queue.options.maxSize) {
                    flushQueue(queueKey);
                } else {
                    scheduleFlush(queueKey);
                }

                return true;
            }

            // sendBeacon and fetchKeepalive are intended as fire-and-forget methods.
            return sendPayload(preparedPayload);
        })();

        // static response for JSON Tag Template callInWindow which only supports synchronous functions
        return true;
    };
})(window);