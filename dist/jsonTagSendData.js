function jsonTagSendData(url, origPayload, enableGzip, dataLayerOptions, sendMethod, cleanPayload){
    //clean payload
    let payload = {};
    if(cleanPayload){
        payload = cleanEventData(origPayload);
    } else {
        payload = origPayload;
    }

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
    } else {
        if( !isWebKit && enableGzip && typeof(CompressionStream) === 'function' ){
            //send json gzip compressed
            Object.assign(post_headers, {
                'Content-Encoding': 'gzip'
            });

            (async function(){
                // Convert JSON to Stream
                const stream = new Blob( [JSON.stringify(payload)], {
                    'type': 'application/json',
                }).stream();

                // gzip stream
                const compressedReadableStream = stream.pipeThrough(
                    new CompressionStream('gzip')
                );

                // create Response
                const compressedResponse = await new Response(compressedReadableStream);

                // Get response Blob
                const blob = await compressedResponse.blob();

                // fetch data
                await fetch( url, {
                    'method': 'POST',
                    'credentials': 'include',
                    'headers': post_headers,
                    'body': blob // send JSON gzipped
                })
                .then( response => {
                    if( !response.ok ){
                        throw new Error( 'HTTP-Error! Status: '+response.status );
                    }
                    return response.json();
                })
                .then( data => {
                    //success case
                    pushResponseToDataLayer(data,dataLayerOptions);
                    return data;
                })
                .catch( error => {
                    //error case
                    console.log(error);
                });
            })();
        } else {  
            //send json uncompressed   
            fetch( url, {
                'method': 'POST',
                'credentials': 'include',
                'headers': post_headers,
                'body': JSON.stringify(payload) // JSON-Body uncompressed!
            })
            .then( response => {
                if( !response.ok ){
                    throw new Error( 'HTTP-Error! Status: '+response.status );
                }
                return response.json();
            })
            .then( data => {
                //success case
                pushResponseToDataLayer(data,dataLayerOptions);
                return data;
            })
            .catch( error => {
                //error case
                console.log(error);
            });
        }
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
};