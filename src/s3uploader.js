var Config = require("../config.js");
var knox = require('knox');
var MultiPartUpload = require('knox-mpu');
var when = require('when');
var _ = require('lodash');
var path = require("path");

var client = knox.createClient(Config.S3);

module.exports = function(file, headers) {

  headers = headers || {};

  var def = when.defer();
  file = path.normalize(file);

  var params = {
    client : client,
    file : file,
    objectName : Config.S3.folder + path.basename(file),
    headers: _.extend({ 'x-amz-acl': 'public-read' }, headers)
  };

  new MultiPartUpload(params, function (err, body) {
    if (err) {
      def.reject(err);
    } else {
      def.resolve(path.basename(file));
    }
  });

  return def.promise;
};