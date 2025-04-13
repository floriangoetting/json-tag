# JSON Tag Template

**Tag Template for client-side Google Tag Manager**

The JSON Tag Template was created to provide a vendor agnostic way to send JSON Payloads from the client-side Google Tag Manager to the server-side Google Tag Manager. It also includes an ID Service to create long lasting server-side set (HTTP-Only) cookies for visitor and session identification.

## How to install this custom template 
To install a custom template you need to have the template.tpl file on your local machine.

For this template you can either download this file directly from GitHub or clone this repo. What you need to keep in mind is that, if there is a new version of the template, you will need to get the latest state again. There is no way to automatically update the template when its not in the "Gallery".
When you have the file, you can add it in GTM. 

In GTM navigate to templates, select New in the Tag Templates, than click on 3 dots in the top right corner and select Import. This will open file explorer where you need to find your template.tpl file, import and save the template.

## Usage and Configuration Options
Add this template to your container and create a new "JSON Tag". Select your JSON Tag Variable in the "Global Settings Configuration Variable" field. If you do not have this Variable yet. Please check https://github.com/floriangoetting/json-tag-variable on how to install and configure the JSON Tag Variable.

It is also a prerequisite to have the JSON Client template installed and a JSON Client configured on your ssGTM Instance. See: https://github.com/floriangoetting/json-client.

Set an Event Name and pick one of the predefined Event Types or define your own one.

Configure your event specific Payload by defining your JSON Keys and selecting your GTM Variables in the Payload Value fields.

Specify a Trigger to define when your JSON Tag should fire.

Test if your JSON Tag fires as expected and contains the right data by using the client-side and server-side GTM Preview mode.

For more details please check the documentation for the different options below.

### Global Settings Configuration Variable
Select your JSON Tag Variable in the "Global Settings Configuration Variable" field. If you do not have this Variable yet. Please check https://github.com/floriangoetting/json-tag-variable on how to install and configure the JSON Tag Variable.

### Event Name
Specify the Event Name which is used to identify the Event at the Server.

### Event Type
You can select one of the predefined Event Types or select "Custom" to be able to specify your own Event Type.

### Event Sending Method
With the Event Sending Method you can define how the event requests should be sent to the server. The default Fetch Method should be fine for most cases but in case of an Exit Link Tracking you might want to consider the Send Beacon Method.

### Event Payload
In this section you can specify your Event Specific Payload Key / Value Pairs by defining your JSON Keys and selecting your GTM Variables in the Payload Value fields. Global Payload Data which is relevant for all your JSON Tags should not be specified here but in the JSON Tag Variable instead. See: https://github.com/floriangoetting/json-tag-variable.
