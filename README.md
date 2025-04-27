# JSON Tag Template

**Tag Template for client-side Google Tag Manager**

The JSON Tag Template was created to provide a vendor agnostic way to send JSON Payloads from the client-side Google Tag Manager to the server-side Google Tag Manager. It also includes an ID Service to create long lasting server-side set (HTTP-Only) cookies for visitor and session identification.

## How to install this Template
1. Download the template.tpl from this GitHub Repository
2. Go to the Templates Section in your GTM
3. In the Tag Templates Section click on "New"
4. Select "Import" in the three dots menu at the top right
5. Select the Downloaded template.tpl file and save the Template
6. Close the Template Editor and go to the Tags Section

Please keep in mind that until this Template is not part of the Community Template Gallery, you will need to get the latest state again if there is a new version of the template.

## Usage and Configuration Options
After you added this template to your container, you can create a new "JSON Tag". Select your JSON Tag Variable in the "Global Settings Configuration Variable" field. If you do not have this Variable yet. Please check https://github.com/floriangoetting/json-tag-variable on how to install and configure the JSON Tag Variable.

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

## How to contribute to the Template
Contributions to any of the Templates are highly welcome! The process to contribute works like this:

1. Fork the repository
2. Pull and merge all updates from the main repository
3. Make your adjustments to the files locally
4. Test the Templates with your changes in GTM and ssGTM
5. If you updated a template.tpl file, please do not replace the full original template.tpl file but only the part from "___TEMPLATE_PARAMETERS___" to the end of the file.
6. Create small commits with good comments to make it easy to follow your adjustments
7. Push the Commits
8. Create a new pull request for the main repository including an understandable summary of your changes

I will review the pull request and will provide feedback or questions if something is unclear. If everything is fine, your changes will be merged with the main repository and you will be listed in the list of contributors!
If you want to contribute but you don't know which adjustments make sense, please check the list of issues (https://github.com/floriangoetting/json-tag/issues), where I and others will list feature wishes or bug reportings.

Please note that it is not planned to support GA4 as destination Analytics Tool. If you want to use GA4 or contribute to a project for first party tracking with GA4 support, please check out Stapes Data Tag (https://github.com/stape-io/data-tag).
