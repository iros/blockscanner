var fetcher = require('./fetcher');
var blockFinder = require('./blockfinder');
var parse = require(__dirname + '/parser');
var when = require("when");
var fs = require("fs");

// cache of all d3 functions we find
var d3Functions = {};

// user we are scanning for
var user = process.argv[2];

// all blocks scanned defered object
var allScanned = when.defer();

blockFinder(user).then(function(blocks) {

  var blocksToScan = blocks.length;
  var blocksScanned = 0;

  // parse each returned block
  blocks.forEach(function(block) {

    console.log("fetching block", block.id);

    // get each block's API hits
    parse(block).then(function(apiHits) {

      // tally up the api hits and assemble which blocks use them.
      apiHits.forEach(function(api) {

        d3Functions[api] = d3Functions[api] || {
          blocks : [],
          count : 0
        };

        d3Functions[api].count++;
        d3Functions[api].blocks.push(block.id);

      });

      blocksScanned++;
      if (blocksScanned === blocksToScan) {
        allScanned.resolve();
      }
    }, function(err) {
      console.error("Failed to parse", block.id);
      blocksScanned++;
    });
  });
}, function(e) {
  allScanned.reject(e);
});

allScanned.promise.then(function() {
  fs.writeFile("output/" + user + ".json",
    JSON.stringify(d3Functions, null, 2),
    function(err) {
      if (err) { console.error(err); }
      else { console.log("File written: " + "output/" + user + ".json"); }
    });
}, function(e) {
  console.error(e);
});