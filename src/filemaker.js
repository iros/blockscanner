// ==== lib deps
var Queue = require("bull");
var Cluster = require("cluster");
var Redis = require("redis");
var config = require("../config.js");
var RedisClient = Redis.createClient(config.redis.port, config.redis.host);
var When = require("when");
var Fs = require("fs");
var S3Upload = require("./s3uploader");
var path = require("path");

// ==== queues
var fileMaker = new Queue("JOB: Create file per API call",
  config.redis.port, config.redis.host);
var fileUploader = new Queue("JOB: Upload done API files",
  config.redis.port, config.redis.host);

fileMaker.process(function(job, done) {
  RedisClient.get(job.data.api, function(err, res) {

    if (err) { done(new Error(err)); }

    if (res.length > 0) {
      res = JSON.parse(res);
      var fileName = path.join(__dirname, "../", "api", job.data.api.split("::")[1] + ".json");
      Fs.writeFile(fileName, JSON.stringify(res, null, 2),
        function(err) {
          if (err) { done(new Error(err)); }
          // queue up file upload
          fileUploader.add({
            file : fileName
          });
          done();
        }
      );
    }
  });
});

fileUploader.process(function(job, done) {
  S3Upload(job.data.file).then(function(filename) {
    done();
  }, function(err) {
    done(new Error(err));
  });
});

fileMaker.on("completed", function(job) {
  console.log("File Written: " + job.data.api);
  job.remove();
}).on("failed", function(job,err) {
  console.error(err);
});

fileUploader.on("completed", function(job) {
  console.log("File Uploaded: " + job.data.file);
  job.remove();
  fileUploader.count().then(function(remaining) {
    if (remaining === 0) {
      console.log("All files uploaded");
      process.exit();
    }
  });
});

RedisClient.keys("API::*", function(err, apiCalls) {
  if (apiCalls.length > 0) {
    apiCalls.forEach(function(api) {
      console.log("addping api " + api);
      fileMaker.add({ api : api });
    });
  }
});
