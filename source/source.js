const logToConsole = require('logToConsole');
const Object = require('Object');
const injectScript = require('injectScript');
const callInWindow = require('callInWindow');
const getContainerVersion = require('getContainerVersion');
const makeTableMap = require('makeTableMap');
const encodeUri = require('encodeUri');

const containerVersion = getContainerVersion();

let eventData = {};

const isDebug = !!(containerVersion && (containerVersion.debugMode || containerVersion.previewMode));

const log = msg => {
   if( isDebug ) logToConsole('[JSON Tag]', msg);
};

const getGlobalConfiguration = () => {
   // Fail if invalid variable
   if (
      data.globalConfig !== 'select' &&
      data.globalConfig.type !== 'jsontag'
   ) {
      return false;
   }

   const config = data.globalConfig !== 'select' ? data.globalConfig : {};

   return config;
};

const globalConfig = getGlobalConfiguration();

const buildPayload = () => {
   //global payload data
   if(typeof globalConfig.globalPayloadData !== 'undefined'){
      const globalEventData = makeTableMap(globalConfig.globalPayloadData, 'payloadKey', 'payloadValue');
      eventData = globalEventData;
   }

   //event payload data
   if(typeof data.payloadData !== 'undefined'){
      const eventSpecificData = makeTableMap(data.payloadData, 'payloadKey', 'payloadValue');
      //if no global payload data is present, no loop is necessary
      if(Object.keys(eventData).length === 0){
         eventData = eventSpecificData;
      } else {
         Object.keys(eventSpecificData).forEach(function(key) {
            eventData[key] = eventSpecificData[key];
         });
      }
   }

   //set event name and event type
   eventData.event_name = data.eventName;
   eventData.event_type = data.eventType == 'custom' ? data.customEventType : data.eventType;

   return eventData;
};

const sendRequest = () => {
   const url = encodeUri(globalConfig.endpointHostname + globalConfig.endpointPath);
   const payload = buildPayload();
   const dataLayerOptions = {
      'dataLayerName': globalConfig.dataLayerName,
      'dataLayerEventName': globalConfig.dataLayerEventName
   };

   const result = callInWindow(
      'jsonTagSendData',
      url,
      payload,
      globalConfig.enableGzip == 'false' ? false : globalConfig.enableGzip,
      globalConfig.pushResponseInDataLayer ? dataLayerOptions : false,
      data.eventSendingMethod,
      globalConfig.cleanPayload
   );

   data.gtmOnSuccess();
};

var libraryUrl = null;
//inject JSON Tag Library if Library Host is set to jsDelivr or Self-hosted
if (globalConfig.libraryHost === 'jsDelivr') {
   libraryUrl = encodeUri('https://cdn.jsdelivr.net/gh/floriangoetting/json-tag@' + globalConfig.libraryVersion + '/dist/jsonTagSendData-min.js');
} else if (globalConfig.libraryHost === 'selfHosted') {
   libraryUrl = encodeUri(globalConfig.libraryUrl);
}

if (libraryUrl) {
   injectScript(libraryUrl, sendRequest, data.gtmOnFailure, 'jsonTagLibrary');
} else {
   //if hosting is set to none, just send the request without any script injections
   sendRequest();
}