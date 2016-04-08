module.exports = function(RED) {
    var child_process = require('child_process');
    var fs = require('fs');

    function VoiceRecordNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        this.on('input', function(msg) {
            msg.payload = msg.payload.toLowerCase();
            node.send(msg);
        });
    }
    RED.nodes.registerType("voice-record", VoiceRecordNode);

    RED.httpAdmin.post("/voice-record/start/:id", RED.auth.needsPermission("debug.write"), 
      function(req, res) {
        var id = req.params.id;
        var node = RED.nodes.getNode(id);

        if (node !== null && typeof node !== "undefined") {
            node.status({fill:"blue", shape:"dot", text:"recording"});
        }
        res.sendStatus(200);
    });

    RED.httpAdmin.post("/voice-record/stop/:id", RED.auth.needsPermission("debug.write"),
      function(req, res) {
        var id = req.params.id;
        var node = RED.nodes.getNode(id);

        if (node != null && typeof node !== "undefined") {
          node.status({});
          
          // console.log(req.body);

          var data = '';
          for (var x in req.body) {
            data += x;
            if (req.body[x] !== undefined && 
                req.body[x].length > 0) {
              data += '=';
              data += req.body[x];
            }
          }

          data = data.replace(/\s/g, '+');

          var buf = new Buffer(data, 'base64');
          var fname = '/tmp/audio-' + id + '.wav';
          fs.writeFile(fname, buf, function(err) {
            if (err) {
              console.log("Error: " + err);
            } else {
              res.sendStatus(200);

              // child_process.exec('aplay ' + fname);

              var msg = {};
              msg.filename = msg.payload = fname;
              node.send(msg);
            }
          });
        }
    });
};
