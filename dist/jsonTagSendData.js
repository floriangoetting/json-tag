function jsonTagSendData(url, origPayload, enableGzip, dataLayerOptions, sendMethod, cleanPayload, addCommonData, xGtmServerPreviewToken){
    // helper functions
    function addCommonDataToPayload(obj){
        obj.page_location = window.location.href;
        obj.page_path = window.location.pathname;
        obj.page_hostname = window.location.hostname;
        obj.page_referrer = document.referrer;
        obj.page_title = document.title;
        obj.page_encoding = document.characterSet;
        obj.screen_resolution = window.screen && (window.screen.width + 'x' + window.screen.height);
        obj.viewport_size = window.innerWidth && window.innerHeight && (window.innerWidth + 'x' + window.innerHeight);
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
        if (dataLayerOptions) {
            const dataLayerName = dataLayerOptions.dataLayerName;
            const dataLayerEventName = dataLayerOptions.dataLayerEventName;

            window[dataLayerName] = window[dataLayerName] || [];

            const eventData = { 'event': dataLayerEventName };
            const jsonclient = {};

            if (data.device_id) {
                jsonclient.device_id = data.device_id;
            }
            if (data.session_id) {
                jsonclient.session_id = data.session_id;
            }
            if (data.tags) {
                jsonclient.tags = data.tags;
            }

            if (Object.keys(jsonclient).length > 0) {
                eventData.jsonclient = jsonclient;
            }

            if (Object.keys(eventData).length > 1) {
                eventData._clear = true; 
                window[dataLayerName].push(eventData);
                return true;
            }
        }
        return false;
    }

    // send data
    (async () => {
        let payload = cleanPayload ? cleanEventData(origPayload) : origPayload;
        payload = addCommonData ? addCommonDataToPayload(payload) : payload;

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

        // define send method based on browser compatibility
        let effectiveSendMethod = sendMethod;
        if (sendMethod === 'sendBeacon' || sendMethod === 'fetchKeepalive') {
            if (isFetchKeepaliveSupported) {
                effectiveSendMethod = 'fetchKeepalive';
            } else if (isNavigatorSendBeaconSupported) {
                navigator.sendBeacon(url, JSON.stringify(payload));
                return true;
            } else {
                effectiveSendMethod = 'fetch'; // Fallback
            }
        }

        if( !isWebKit && effectiveSendMethod === 'fetch' && enableGzip && typeof CompressionStream === 'function' ){
            // fetch + gzip
            try {
                post_headers['Content-Encoding'] = 'gzip';

                // Convert JSON to Stream
                const stream = new Blob( [JSON.stringify(payload)], {
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
            // fetch or fetchKeepalive, uncompressed
            try {
                let fetchOptions = {
                    'method': 'POST',
                    'credentials': 'include',
                    'body': JSON.stringify(payload) // JSON-Body uncompressed!
                };

                if( effectiveSendMethod === 'fetchKeepalive' ){
                    // add keepalive option if fetch keepalive is selected and supported
                    fetchOptions.keepalive = true;
                    post_headers['X-Keepalive-Request'] = 1;
                }

                fetchOptions.headers = post_headers;

                const response = await fetch( url, fetchOptions);

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
    })();

    // static response for JSON Tag Template callInWindow which only supports synchronous functions
    return true;
};