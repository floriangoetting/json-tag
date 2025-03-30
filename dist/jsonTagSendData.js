function jsonTagSendData(url, payload, enableGzip, dataLayerOptions, sendMethod){
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
        if( enableGzip && typeof(CompressionStream) === 'function' ){
            //send json gzip compressed
            Object.assign(post_headers, {
                'Content-Encoding': 'gzip'
            });

            (async function(){
                // Convert JSON to Stream
                const stream = new Blob( [JSON.stringify(payload)], {
                    type: 'application/json',
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
                    method: 'POST',
                    credentials: 'include',
                    headers: post_headers,
                    body: blob // sent JSON gzipped
                })
                .then( response => {
                    if( !response.ok ){
                        throw new Error( 'HTTP-Error! Status: '+response.status );
                    }
                    return response.json();
                })
                .then( data => {
                    //success case
                    pushIdsToDataLayer(data,dataLayerOptions);
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
            method: 'POST',
            credentials: 'include',
            headers: post_headers,
            body: JSON.stringify(payload) // JSON-Body uncompressed!
            })
            .then( response => {
                if( !response.ok ){
                    throw new Error( 'HTTP-Error! Status: '+response.status );
                }
                return response.json();
            })
            .then( data => {
                //success case
                pushIdsToDataLayer(data,dataLayerOptions);
                return data;
            })
            .catch( error => {
                //error case
                console.log(error);
            });
        }
    }
    function pushIdsToDataLayer(data, dataLayerOptions){
        if (dataLayerOptions && !dataLayerOptions.idsInDataLayer) {
            const dataLayerName = dataLayerOptions.dataLayerName;
            const dataLayerEventName = dataLayerOptions.dataLayerEventName;

            window[dataLayerName] = window[dataLayerName] || [];

            const eventData = { 'event': dataLayerEventName };

            if (data.device_id) {
                eventData.device_id = data.device_id;
            }
            if (data.session_id) {
                eventData.session_id = data.session_id;
            }

            if (Object.keys(eventData).length > 1) { 
                window[dataLayerName].push(eventData);
                return true;
            }
        }
        return false;
    }
};