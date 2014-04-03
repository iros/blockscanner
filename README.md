# Block API Dictionary Builder

This project goes through a specific user's blocks and checks them against the current d3 api for any co-occurance. It tallies up the results for every possible API call, adding up the blocks that use it as well as the total count.

To setup:

1. `npm install`
2. Update the `config.js` file with your own github api token. You can read about getting tokens here: https://github.com/blog/1509-personal-api-tokens

To run:

`node src/runner.js someUserName`

For example:

`node src/runner.js mbostock`

The result goes into the `output` folder. See sample output there.

# Features that would be awesome:

1. co-occurance of calls.
2. for some users we scan through most blocks, but not all. Try running with `syntagmatic` (232 out of 234 are scanned. No idea why and no time to debug atm.)
3. Non block scanning...
4. Scanning many users at once

# Contributions

- Make an issue
- Send a pull request