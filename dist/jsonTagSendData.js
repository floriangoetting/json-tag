function jsonTagSendData(url, origPayload, enableGzip, dataLayerOptions, sendMethod, cleanPayload){
    //helper functions
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

    //send data
    (async () => {
        const payload = cleanPayload ? cleanEventData(origPayload) : origPayload;

        const isWebKit = /AppleWebKit/i.test(navigator.userAgent) && !/Chrome|CriOS|OPR|Edg|Edge|FxiOS|SamsungBrowser|Android/i.test(navigator.userAgent); // WebKit has issues with compressionStream :/

        let post_headers = {
            'Content-Type': 'application/json'
        };

        if( typeof (navigator.sendBeacon) !== 'function' ){
            // in case we do not have sendBeacon, fallback to fetch...
            sendMethod = 'fetch';
        }

        if( sendMethod === 'sendBeacon' ){
            navigator.sendBeacon( url, JSON.stringify(payload) );
            return true;
        } else {
            if( !isWebKit && enableGzip && typeof CompressionStream === 'function' ){
                try {
                    //send json gzip compressed
                    Object.assign(post_headers, {
                        'Content-Encoding': 'gzip'
                    });

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
                try {
                    //send json uncompressed   
                    const response = await fetch( url, {
                        'method': 'POST',
                        'credentials': 'include',
                        'headers': post_headers,
                        'body': JSON.stringify(payload) // JSON-Body uncompressed!
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
            }
        }
    })();

    //static response for JSON Tag Template callInWindow which only supports synchronous functions
    return true;
};