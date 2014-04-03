var when = require("when");

var github = require(__dirname + '/connection');
var d3Functions = require(__dirname + '/d3Functions');
var parser = require(__dirname + '/parser');

var filePatterns = [/index.html/, /.+\.js$/];

module.exports = function(id) {

  var def = when.defer();

  github.gists.get({ id : id }, function(err, res) {
    if (err) { def.reject(err); return; }
    def.resolve(parser(res));
  });

  return def.promise;
};


