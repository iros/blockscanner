var GitHubApi = require("github");

var github = new GitHubApi({
    // required
    version: "3.0.0"
});

module.exports = github;