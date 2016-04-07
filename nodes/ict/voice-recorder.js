module.exports = function(RED) {
    var child_process = require('child_process');
    var children = {};
    var cmd = 'arecord -t wav -f S16_LE -r 8000 -c1 ';

    function VoiceRecordNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        this.on('input', function(msg) {
            msg.payload = msg.payload.toLowerCase();
            node.send(msg);
        });
    }
    RED.nodes.registerType("voice-record", VoiceRecordNode);

    RED.httpAdmin.post("/voice-record/:id/:state", RED.auth.needsPermission("debug.write"), function(req, res) {
        var id = req.params.id;
        var state = req.params.state;
        var node = RED.nodes.getNode(id);

        if (node !== null && typeof node !== "undefined") {
           var filename = '/tmp/audio-' + id + '.wav';
           // console.log('filename is ' + filename);

           if (state === "enable") {
              node.status({fill:"blue", shape:"dot", text:"recording"});

              children[id] = child_process.exec(cmd + filename);
              children[id].on('exit', function (code, signal) {
                // node.log('the exit code is ' + code + ' signal ' + signal);
                var msg = {
                  'filename' : filename
                };

                node.send(msg);
              });
           } else {
              node.status({});

              children[id].kill('SIGINT');
              children[id] = null;

              child_process.exec('aplay ' + filename);
           }
        }
        res.sendStatus(200);
    });
};
