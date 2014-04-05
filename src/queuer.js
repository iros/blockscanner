// ==== lib deps
var Queue = require("bull");
var Cluster = require("cluster");
var Redis = require("redis");
var RedisClient = Redis.createClient(6379, "127.0.0.1");
var When = require("when");
var CSV = require("csv");
var https = require("https");

// ==== src deps
var blockFinder = require('./blockfinder');
var parse = require(__dirname + '/parser');

// ==== config
var userDoc = "https://docs.google.com/spreadsheet/pub?"+
  "key=0Al5UYaVoRpW3dE12bzRTVEp2RlJDQXdUYUFmODNiTHc&single=true&gid=0&output=csv";

// ==== our queues
var blockListQueue = new Queue("JOB: Gets blocks for a user", 6379, "127.0.0.1");
var gistParserQueue = new Queue("JOB: Gets API usage in a gist", 6379, "127.0.0.1");
var apiAggregatorQueue = new Queue("JOB: Aggregates API usage", 6379, "127.0.0.1");
var redisStorageQueue = new Queue("JOB: Store in Redis", 6379, "127.0.0.1");

// ==== message queues
var MessageTypes = {
  GistsFetched : 1,
  GistParsed: 2,
  APIProcessed : 3
};

var messageQueue = new Queue("BROKER: Message broker", 6379, "127.0.0.1");

// every time we are told to get the blocks for a user..
blockListQueue.process(function(job, done) {

  blockFinder(job.data.userId).then(function(blocks) {
    messageQueue.add({
      type: MessageTypes.GistsFetched,
      userId: job.data.userId,
      blocks : blocks
    });
    done();
  }, function(err) {
    done(new Error(err));
  });

});

// Parses a single gist.
gistParserQueue.process(function(job, done) {

  // parse each returned block
  job.data.blocks.forEach(function(block) {

    // get each block's API hits
    parse(block).then(function(apiHits) {

      messageQueue.add({
        userId: job.data.userId,
        block: block,
        type: MessageTypes.GistParsed,
        apiHits: apiHits
      });
      done();
    }, function(err) {
      done(new Error(err));
    });
  });
});

// Aggregates API
apiAggregatorQueue.process(function(job, done) {

  job.data.apiHits.forEach(function(api, i) {
    redisStorageQueue.add({
      block : job.data.block,
      api : api,
      userId: job.data.userId,
      apiHits : job.data.apiHits
    });
  });

  done();
});

// stores API in redis
redisStorageQueue.process(function(job,done) {

  var block = job.data.block;
  var apiCall = job.data.api;

  var redisKey = "API::" + apiCall;

  RedisClient.get(redisKey, function(err, res) {
    if (err) { done(new Error(err)); }

    // we don't have an entry yet, MAKE ONE!
    if (res === null || res.length === 0) {

      res = {
        api : apiCall,
        blocks : {},
        count : 1,
        coocurance : {}
      };

      // cache block userId, description & thumbnail
      res.blocks[job.data.block.id] = {
        userId: job.data.userId,
        description : job.data.block.description,
        thumbnail: job.data.block.files["thumbnail.png"] ?
          job.data.block.files["thumbnail.png"].raw_url :
          ""
      };

      // initialize co-occurance database
      job.data.apiHits.forEach(function(otherCall) {
        if (otherCall !== apiCall) {
          res.coocurance[otherCall] = 1;
        }
      });

      RedisClient.set(redisKey, JSON.stringify(res), function(err) {
        if (err) { done(new Error(err)); }
        else { done(); }
      });

    // we already have an entry so:
    //  - add this block to the block list
    //  - increment counter
    } else {
      res = JSON.parse(res);

      if (typeof res.blocks[block.id] === "undefined") {

        res.blocks[block.id] = {
          userId: job.data.userId,
          description: block.description,
          thumbnail : job.data.block.files["thumbnail.png"] ?
            job.data.block.files["thumbnail.png"].raw_url :
            ""
        };
        res.count += 1;

        // increment co-occurance database
        job.data.apiHits.forEach(function(otherCall) {
          res.coocurance[otherCall] = res.coocurance[otherCall] + 1 || 1;
        });

        RedisClient.set(redisKey, JSON.stringify(res), function(err) {
          if (err) { done(new Error(err)); }
          else { done(); }
        });

      // do nothing if this block is already registered.
      } else {
        done();
      }
    }
  });
});

// MAIN BROKER QUEUE
messageQueue.process(function(message, done) {

  // We have gists for a user
  if (message.data.type === MessageTypes.GistsFetched) {
    console.log(message.data.blocks.length + " blocks obtained for " + message.data.userId);
    gistParserQueue.add(message.data);
    done();
  }

  // we have API hits for a single block
  if (message.data.type === MessageTypes.GistParsed) {

    // we only want to handle gists that have API hits, obvs
    if (message.data.apiHits.length !== 0) {
      apiAggregatorQueue.add(message.data);
    }
    done();
  }

  // we added the API
  if (message.data.type === MessageTypes.APIProcessed) {
    done();
  }

});


// ==== Queue error handling
blockListQueue.on("failed", function(job, err) {
  console.error(err);
});

messageQueue.on("failed", function(job, err) {
  console.error(err);
});

// Get the google spreadsheet of users
https.get(userDoc, function(res) {
  var doc = "";

  // assemble the result
  res.on("data", function(chunk) {
    doc += chunk;
  });

  // when we have the full document...
  res.on("end", function() {
    var users = [];

    // parse it as a csv and extract the user names
    CSV()
      .from.string(doc)
      .on("record", function(row, idx) {
        if (idx > 0) {
          users.push(row[1]);
        }
      })

      // when we have all the users, kick off our queue.
      .on("end", function() {
        users.forEach(function(user) {
          blockListQueue.add({ userId: user });
        });

        var allZero = 0;

        // set watch on our queue
        setInterval(function() {
          When.all([
            blockListQueue.count(),
            gistParserQueue.count(),
            apiAggregatorQueue.count(),
            redisStorageQueue.count()
          ]).then(
            function(results) {
              if ((results[0] + results[1] + results[2] + results[3]) === 0) {
                allZero += 1;
              }

              // if the last 10 readings were all zero, exit program
              if (allZero === 10) {
                console.log("terminating");
                process.exit();
              }
            });

        }, 1000);
      });
  });
});