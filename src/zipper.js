var fs = require("fs");
var path = require("path");
var archiver = require("archiver");
var when = require("when");

module.exports = function(dir, pattern) {
  var def = when.defer();

  var outputFilename = dir + "/api.zip";
  var output = fs.createWriteStream(outputFilename);
  var archive = archiver("zip");

  output.on("close", function() {
    console.log("Wrote out api.zip, total size: " + archive.pointer());
    def.resolve(path.join(__dirname, "../", dir, "api.zip"));
  });

  output.on("error", function(err) {
    console.error("Failed to write api.zip", err);
    def.reject(err);
  });

  archive.pipe(output);

  archive.bulk([
    {
      expand:true,
      cwd: path.join(__dirname, "../", dir),
      src: pattern,
      dest: dir
    }
  ]);

  archive.finalize();
  return def.promise;
};