var github = require(__dirname + '/connection');
var when = require("when");
var AUTH = require("../config.js");
var _ = require("lodash");

module.exports = function(userId) {

  var def = when.defer();
  var fetchAllPages = when.defer();

  var startingPage = 0, per_page = 100;
  var blocks = [];

  function getPage(pageNum) {

    // OAuth2
    github.authenticate({
        type: "oauth",
        token: AUTH.githubToken
    });

    github.gists.getFromUser({ user: userId, per_page : per_page, page: pageNum},
    function(err, res) {
      if (err) { fetchAllPages.reject(err); return; }

      if (res) {
        blocks = _.union(blocks, res);
      }

      pageNum++;

      if (res.length === per_page) {
        // try to get next page
        getPage(pageNum);
      } else {
        fetchAllPages.resolve();
      }
    });
  }

  fetchAllPages.promise.then(function() {

    // return all the blocks!
    def.resolve(blocks);

  }, function(err) {
    def.reject(err);
  });

  getPage(startingPage);

  return def.promise;
};