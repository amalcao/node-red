/**
 * Copyright 2015 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function (RED) {
  var request = require('request');
  var fs = require('fs');
  var vopUrl = "http://vop.baidu.com/server_api";

  function Node (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.on('close',  function() {
      node.status({});
    });

    this.on('input', function (msg) {
      if (!msg.payload) {
        var message = 'Missing property: msg.payload';
        node.error(message, msg)
        return;
      }

      if (!msg.payload instanceof Buffer || !typeof msg.payload === 'string') {
        var message = 'Invalid property: msg.payload, must be a URL or a Buffer.';
        node.error(message, msg)
        return;
      }

      if (!config.lang) {
        var message = 'Missing audio language configuration, unable to process speech.';
        node.error(message, msg)
        return;
      }
      
      /* TODO : verify the input configurations (cuid, apikey, secretkey, ...) !! */
      var vop = function(token) {
         var params = {
           format: "wav",
           rate: config.rate,
           channel: 1,
           lan: config.lang,
           token: token,
           cuid: config.cuid,
         };

         if (msg.payload instanceof Buffer) {
             params.len = msg.payload.length;
             params.speech = msg.payload.toString('base64');
         } else {
             // -- TODO --
             params.url = msg.payload;
             params.callback = msg.callback;
         }

         request({
            url: vopUrl,
            method: 'POST',
            json: params
           },

           function(err, res, body) {
             if (err !== null) {
               node.log('error message is ' + err);
               node.status({fill:'red', shape:'dot', text:err.toString()});
             } else {

               node.log(body);

               if (body.err_no !== 0) {
                 node.status({fill:'red', shape:'dot', text:body.err_msg});
               } else {
                 var result = body.result;
           
                 node.log(result);

                 node.status({});
                 msg.transcription = new Array();
                 if (result instanceof Array && result.length > 0) {
                   for (var x in result) {
                     node.log(result[x]);
                     msg.transcription.push(
                        result[x].replace(/，/g, ',').replace(/[,]\s*$/, '').split(', ')[0] );
                   }
                   node.log(msg.transcription);
                 }
               }
             }

             node.send(msg);
         });

      };

      node.status({fill:"blue", shape:"dot", text:"requesting"});
      // -- try to getting the access token --
      var auth_url = "https://openapi.baidu.com/oauth/2.0/token?grant_type=client_credentials&client_id=" + config.apikey + "&client_secret=" + config.secretkey;

      var req = request(
            { url: auth_url,
              method: 'GET',
              timeout: 5000
            }, 
            function(err, res, body) {
                  if (err !== null) {
                    node.log('error message is ' + err);
                    node.send(msg);
                    node.status({fill:'red', shape:'dot', text:err.toString()});
                    return;
                  }

                  node.log(res.headers);
                  node.log(body);

                  var access_token = JSON.parse(body).access_token;
                  node.log(access_token);

                  // -- try to access the vop serice -- 
                  vop(access_token);
      });
      
    });
  }
  RED.nodes.registerType('baidu-speech-to-text', Node, {
        credentials: {
            username: {type:"text"},
            password: {type:"password"}
        }
  });
};
