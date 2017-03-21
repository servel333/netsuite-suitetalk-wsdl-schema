#!/usr/local/bin/node
'use strict';
/* eslint-disable no-alert, no-console */

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const soap = require('soap');
const wsdl = require('netsuite-suitetalk-wsdl-v2016-2.0');

console.log('Loading NetSuite SuiteTalk client...');

const PATH = path.join(__dirname, '..','tmp');
const LOG = path.join(PATH, 'dump.log');
_.attempt(fs.mkdirSync, PATH);
// _.attempt(fs.unlinkSync, LOG);

var appendTo = function(file, ...args){
  var data = args.join('');
  fs.appendFileSync(file, data);
};

soap.createClient(wsdl.file, function(err, client){
  if(err) {
    console.error('Error loading soap client:', err);
    return;
  }

  ////////////////////
  // Generate Complex Types list

  const COMPLEX_TYPES_FILE = path.join(PATH, 'complexTypes.json');
  console.log('Writing to '+COMPLEX_TYPES_FILE);

  var complexTypes = {};
  _.each(_.get(client, 'wsdl.definitions.schemas'), (schema, namespaceUri) => {
    _.each(_.get(schema, 'complexTypes'), (type, typeName) => {
      complexTypes[typeName] = namespaceUri;
    });
  });
  complexTypes = _(complexTypes).toPairs().sortBy(0).fromPairs().value();
  _.attempt(fs.unlinkSync, COMPLEX_TYPES_FILE);
  appendTo(COMPLEX_TYPES_FILE, JSON.stringify(complexTypes, null, 2));

  ////////////////////
  // Generate Attributes in Complex Types list

  const COMPLEX_TYPE_ATTRIBUTES_FILE = path.join(PATH, 'complexTypeAttributes.json');
  console.log('Writing to '+COMPLEX_TYPE_ATTRIBUTES_FILE);

  var complexTypeAttributess = [];
  // 'wsdl.definitions.schemas[].complexTypes.Customer.children[0].children[0]',

  _.each(_.get(client, 'wsdl.definitions.schemas'), (schema, namespaceUri) => {
    _.each(_.get(schema, 'complexTypes'), (type, typeName) => {
      _.each(_.get(type, 'children'), (complexContent) => {
        _.each(_.get(complexContent, 'children'), (extension) => {

          // "nsName": "attribute",
          // "prefix": "__tns__",
          // "name": "attribute",
          // "children": [],
          // "$name": "externalId",
          // "$type": "xsd:string"

          complexTypeAttributess.push({
            complexTypeName: typeName,
            name: extension.$name,
            type: extension.$type,
          });
        });
      });
    });
  });
  complexTypeAttributess = _.sortBy(complexTypeAttributess, v => ''+v.complexTypeName+v.name);
  _.attempt(fs.unlinkSync, COMPLEX_TYPE_ATTRIBUTES_FILE);
  appendTo(COMPLEX_TYPE_ATTRIBUTES_FILE, JSON.stringify(complexTypeAttributess, null, 2));

  ////////////////////
  // Generate Method Names list

  const METHOD_NAMES_FILE = path.join(PATH, 'methodNames.json');
  console.log('Writing to '+METHOD_NAMES_FILE);

  var methodNames = [];
  _.each(_.get(client, 'wsdl.services.NetSuiteService.ports.NetSuitePort.binding.methods'), (methodDescription, methodName) => {
    methodNames.push(methodName);
  });
  methodNames = _.sortBy(methodNames);
  _.attempt(fs.unlinkSync, METHOD_NAMES_FILE);
  appendTo(METHOD_NAMES_FILE, JSON.stringify(methodNames, null, 2));

  ////////////////////
  // Build log

  console.log('Writing to '+LOG);
  appendTo(LOG, "\n\n////////////////////////////////////////////////////////////\n// BEGINNING DUMP\n");

  _.each([
    // 'wsdl',
    // 'wsdl.definitions',
    // 'wsdl.definitions.schemas',
    // 'wsdl.definitions.schemas["urn:relationships_2016_2.lists.webservices.netsuite.com"].complexTypes.Customer',
    // 'wsdl.definitions.descriptions',
    // 'wsdl.definitions.descriptions.types',
    // 'wsdl.definitions.xmlns',
    // 'wsdl.definitions.valueKey',
    // 'wsdl.definitions.xmlKey',
    // 'wsdl.definitions.ignoredNamespaces',
    // 'wsdl.definitions.$targetNamespace',
    // 'wsdl.definitions.messages',
    // 'wsdl.definitions.portTypes',
    // 'wsdl.definitions.bindings',
    // 'wsdl.definitions.services',
    // 'wsdl.services',
    // 'wsdl.services.NetSuiteService.ports.NetSuitePort.binding',
    // 'wsdl.services.NetSuiteService.ports.NetSuitePort.binding.methods',
    // 'wsdl.services.NetSuiteService.ports.NetSuitePort.binding.topElements',
    // 'wsdl.uri',
    // 'wsdl._includesWsdl',
    // 'wsdl.WSDL_CACHE',
    // 'wsdl._originalIgnoredNamespaces',
    // 'wsdl.options',
    // 'wsdl.xml',
    // 'wsdl.xmlnsInEnvelope',
  ], keypath => {
    var value = _.get(client, keypath);
    try{ value = JSON.stringify(value); } catch(err){ value = "FAILED TO STRINGIFY"+err.message; }
    appendTo(LOG, "\n\n////////////////////\n// '"+keypath+"'\n"+value);
  });

});
