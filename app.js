/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var express = require('express'),
  app       = express(),
  fs        = require('fs'),
  path      = require('path'),
  bluemix   = require('./config/bluemix'),
  extend    = require('util')._extend,
  watson    = require('watson-developer-cloud'),
  empty     = require('is-empty');

// Bootstrap application settings
require('./config/express')(app);

// if bluemix credentials exists, then override local
var credentials =  extend({
  url: 'https://gateway.watsonplatform.net/dialog/api',
  username: '3be7093e-99a6-4212-89ed-30cefa0d74c7',
  password: 'AYwkT1RvMk8n',
  version: 'v1'
}, bluemix.getServiceCreds('dialog')); // VCAP_SERVICES


var dialog_id_in_json = (function() {
  try {
    var dialogsFile = path.join(path.dirname(__filename), 'dialogs', 'dialog-id.json');
    var obj = JSON.parse(fs.readFileSync(dialogsFile));
    return obj[Object.keys(obj)[0]].id;
  } catch (e) {
  }
})();


var dialog_id = process.env.DIALOG_ID || dialog_id_in_json || 'ae36a389-39a3-4a5a-a80b-5998cc6fa81d';

// Create the service wrapper
var dialog = watson.dialog(credentials);

app.post('/conversation', function(req, res, next) {
  var params = extend({ dialog_id: dialog_id }, req.body);
  console.log(!empty(req.body));
  if(!empty(req.body)) {
    dialog.conversation(params, function(err, results) {
      if (err)
        return next(err);
      else
        // sendtoAlchemy(req.body.input, function() {
        //   res.json({ dialog_id: dialog_id, conversation: results});
        // });
      classifierCall(req.body.input, function() {
        res.json({ dialog_id: dialog_id, conversation: results});
      });
    });
  }
  });

app.post('/profile', function(req, res, next) {
  var params = extend({ dialog_id: dialog_id }, req.body);
  dialog.getProfile(params, function(err, results) {
    if (err)
      return next(err);
    else
      res.json(results);
  });
});

// error-handler settings
require('./config/error-handler')(app);

var port = process.env.VCAP_APP_PORT || 3000;
app.listen(port);
console.log('listening at:', port);


var alchemy_language = watson.alchemy_language({
  api_key: '2fa8b7cf52d8cdc27bcdd82a4dc22948e13cc69a'
});

function sendtoAlchemy(body, callBack) {
  var alchemy_params = { text: body, extract: 'keywords' };
  alchemy_language.combined(alchemy_params, function (err, response) {
    if (err)
      console.log('error:', err);
    else
      console.log(JSON.stringify(response, null, 2));
    if (response !== null) {
      addToKeyWords(response);
    };
      callBack();
  });
}

function addToKeyWords(response) {
  var keywords = [];
  response.keywords.forEach(function(word) {
    keywords.push(word.text)
  });
  console.log(keywords);
};

var nlClassifier = watson.natural_language_classifier({
  url : 'https://gateway.watsonplatform.net/natural-language-classifier/api',
  username : 'b1020097-b93a-42d8-b764-50d2220855eb',
  password : 'CjrgpdC6zGnZ',
  version  : 'v1'
});

function classifierCall(body, callBack) {
  var classifyParams = {
    classifier: process.env.CLASSIFIER_ID || '3a84cfx63-nlc-13566', // pre-trained classifier
    text: body
  };

  nlClassifier.classify(classifyParams, function(err, results) {
    if (err)
      return (err);
    else
      console.log(results);
      // res.json(results);
  });
  callBack();
};


