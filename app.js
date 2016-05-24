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

var keywords = [];
var topClass = null;
var conversationId = false;

var actions = {
  "how to" : { "claim" : "phone this number 0800123123" },
  "time" : { "claim" : "it's dinner time", "payment" : "you owe money" },
  "do you cover" : { "tools" : "01", "buildings" : "02", "public liability" : "03" }
};

var express = require('express'),
  app       = express(),
  fs        = require('fs'),
  path      = require('path'),
  bluemix   = require('./config/bluemix'),
  extend    = require('util')._extend,
  watson    = require('watson-developer-cloud'),
  empty     = require('is-empty'),
  session   = require('express-session');

// Bootstrap application settings
require('./config/express')(app);

app.use(session({ secret: 'keyboard cat'}));

// if bluemix credentials exists, then override local
var credentials =  extend({
  url: 'https://gateway.watsonplatform.net/dialog/api',
  username: 'e9510e78-0462-4864-8100-355f36101e6e',
  password: 'Jw4HFBpqLLt6',
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


var dialog_id = process.env.DIALOG_ID || dialog_id_in_json || '037e8a89-e713-4065-9717-b7cc2acb3e2e';

// Create the service wrapper
var dialog = watson.dialog(credentials);

app.post('/conversation', function(req, res, next) {
  var params = extend({ dialog_id: dialog_id }, req.body);
  if(!empty(req.body)) {
    var consId = req.body.conversation_id;
    var clientId = req.body.client_id;
    sendtoAlchemy(req.body.input, function() {
      classifierCall(req.body.input, function() {
        var intent = topClass;
        var keyword = keywords[0];
        if (!empty(intent) && !empty(keyword)) {
          var action = actions[intent][keyword];
        };

              console.log(req.body.conversation_id);
              console.log(req.body);
          if (action || req.body.conversation_id) {
            if ( req.body.conversation_id || intent === "do you cover") {
              // console.log(req.body);
              dialog.conversation(params, function(err, results) {
                if (err)
                  return next(err);
                else
                  res.json({ dialog_id: dialog_id, conversation: results});
              });
            } else {
              res.json({ dialog_id: 10, conversation: conversationResponse(action)});
            }
          } else {
            res.json({ dialog_id: 10, conversation: conversationResponse('What?')});
          }


          // res.json({ dialog_id: dialog_id, conversation: results});
      });
    });


    // dialog.conversation(params, function(err, results) {
    //   console.log(results);
    //   if (err)
    //     return next(err);
    //   else
    //       res.json({ dialog_id: dialog_id, conversation: results});
    // });
  }
});

function  conversationResponse(action) {
   return {
    conversation_id: '',
    client_id: '2595560',
    input: 'hello',
    confidence: -1,
    response: [ action ] };
}

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
    if (response !== null) {
      addToKeyWords(response);
    };
    callBack();
  });
}

function addToKeyWords(response) {
  keywords = [];
  response.keywords.forEach(function(word) {
    keywords.push(word.text)
  });
};

var nlClassifier = watson.natural_language_classifier({
  url : 'https://gateway.watsonplatform.net/natural-language-classifier/api',
  username : 'b1020097-b93a-42d8-b764-50d2220855eb',
  password : 'CjrgpdC6zGnZ',
  version  : 'v1'
});

function classifierCall(body, callBack) {
  var classifyParams = {
    classifier: process.env.CLASSIFIER_ID || '3a84cfx63-nlc-14828', // pre-trained classifier
    text: body
  };
  nlClassifier.classify(classifyParams, function(err, results) {

    if (err) {
      console.log(err);
    }
    else {
      if (results !== null) {
        console.log(results);
        getTopClass(results);
      };
    }
  callBack();
  });
};


function getTopClass(response) {
  topClass = response.top_class
};
