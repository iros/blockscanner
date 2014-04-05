// ==== lib deps
var Queue = require("bull");
var Cluster = require("cluster");
var Redis = require("redis");
var RedisClient = Redis.createClient(6379, "127.0.0.1");
var When = require("when");
var Fs = require("fs");


// ==== queues
var fileMaker = new Queue("JOB: Create file per API call", 6379, "127.0.0.1");

fileMaker.process(function(job, done) {
  RedisClient.get(job.data.api, function(err, res) {
    if (res.length > 0) {
      res = JSON.parse(res);
      Fs.writeFile("./api/" + job.data.api.split("::")[1] + ".json",
        JSON.stringify(res, null, 2),
        function(err) {
          if (err) { done(new Error(err)); }
          done();
        }
      );
    }
  });
});

fileMaker.on("completed", function(job) {
  console.log("Write out " + job.data.api);

  fileMaker.count().then(function(remaining) {
    if (remaining === 0) {
      console.log("all files written");
      process.exit();
    }
  });

}).on("failed", function(job,err) {
  console.error(err);
});

RedisClient.keys("API::*", function(err, apiCalls) {
  if (apiCalls.length > 0) {
    apiCalls.forEach(function(api) {
      fileMaker.add({ api : api });
    });
  }
});
