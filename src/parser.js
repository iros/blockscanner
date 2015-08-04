var when = require("when");
var https = require("https");
var _ = require("lodash");

var d3Functions = require(__dirname + '/d3Functions');

var filePatterns = [/index.html/, /.+\.js$/];

module.exports = function(block) {

  var def = when.defer();

  // remote urls.
  var rawUrls = [];
  var allFetched = when.defer();

  var existing = [];
  var fileNames = Object.keys(block.files);
  if (fileNames.length) {

    fileNames.forEach(function(fileName) {

      // does it match any of the acceptable file patterns?
      var isPassing =  filePatterns.map(function(pattern) {
        if (pattern.test(fileName)) { return true; }
        else { return false;}
      }).reduce(function(prev, curr, i, arr){
        return curr || prev;
      }, false);

      // as long as the file matches our pattern, look through its
      // contents for the appropriate d3 api.
      if (isPassing) {

        // if we have the content in the block, just parse it
        var content = block.files[fileName].content;
        if (content) {

          d3Functions.forEach(function(api) {
            var re = new RegExp(api, 'g')
            var matches = content.match(re)
            if(matches && matches.length) {
              existing.push({name: api, count: matches.length});
            }
          });

        // otherwise if we have a url to the content in the block
        // retrieve it.
        } else if (block.files[fileName].raw_url) {
          rawUrls.push(block.files[fileName].raw_url);
        }
      }
    });

    // fetch all remote urls
    var rawUrlFetchers = [], rawUrlPromises = [];

    rawUrls.forEach(function(raw_url) {
      var rawUrlDef = when.defer();
      rawUrlFetchers.push(rawUrlDef);
      rawUrlPromises.push(rawUrlDef.promise);
    });

    if (rawUrlFetchers.length === 0) {
      allFetched.resolve();
    } else {

      when.all(rawUrlPromises).then(function() {
        allFetched.resolve();
      });

      var i = 0;
      rawUrls.forEach(function(url) {
        var urlRawDef = rawUrlFetchers[i++];

        https.get(url, function(res) {
          var buf = "";

          res.on("data", function(data) {
            buf += data;
          });

          res.on("end", function() {
            var data = buf.toString();
            d3Functions.forEach(function(api) {
              var re = new RegExp(api, 'g')
              var matches = data.match(re)
              if(matches && matches.length) {
                existing.push({name: api, count: matches.length});
              }
            });

            urlRawDef.resolve();
          });
        }).on("error", function(e) {
          urlRawDef.reject(e);
        });
      });
    }
  } else {
    allFetched.resolve(existing);
  }

  allFetched.promise.then(function() {
    // remove duplicates
    existing = _.uniq(existing);

    def.resolve(existing);
  }, function(err) {
    def.reject(err);
  });

  return def.promise;
};

