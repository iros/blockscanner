# Block API Dictionary Builder

This project scans the blocks (gists) of d3 users. It uses the results of this form:

https://docs.google.com/forms/d/1VdDdycNuqJVw3Ik6-ZLj6v7X9g2vWlw_RCC3RCfD9-I/viewform

Then it scans all their gists, and extracts the results. There are two types of tasks
you probably want to run:

1. scan all the users' gists
2. output the results, by API call to your local file system.

## Setup

1. `npm install`
2. Update the `config.js` file with:
  * your own github api token. You can read about getting tokens here: https://github.com/blog/1509-personal-api-tokens
  * your redis database connection details
3. make sure your redis server is running

## Running

### Scanning all users:

Make sure redis is running and then:

`node src/queuer.js`

### Outputting results per API:

Make sure redis is running and then:

`node src/filemaker.js`

The results go into the `api` folder. There will be a file for each api call in d3, for example:

`d3.svg.axis.json`.

It will look like this:

```json
{
  "api": "d3.svg.axis",
  "blocks": {
    "4215939": {
      "userId": "vlandham",
      "description": "Focus+Context via Brushing",
      "thumbnail": "https://gist.githubusercontent.com/vlandham/4215939/raw/9b1031ca53bbadcdfad590800d4f636d7079f682/thumbnail.png"
    },
    "69a97f937b6147e67edd": {
      "userId": "iros",
      "description": "d3.chart piebars",
      "thumbnail": ""
    }
  },
  "count": 4,
  "coocurance": {
    "d3.select": 4,
    "d3.format": 2,
    "d3.scale": 4,
    "d3.scale.linear": 3,
    "d3.svg": 4
  }
}
```

### Results per user:

This does not require redis:

`node src/runner.js someUserName`

For example:

`node src/runner.js mbostock`
The result goes into the `output` folder. See sample output there.

*Note that the output format is smaller. It only shows the block ids and counts, no coocurance or block metadata. It's an older version of this script and I've kept it for fun.*

# Features that would be awesome:

1. [DONE] co-occurance of calls.
2. [FIXED] for some users we scan through most blocks, but not all. Try running with `syntagmatic` (232 out of 234 are scanned. No idea why and no time to debug atm.)
3. [NOT SURE WHAT I MEANT HERE]Non block scanning...
4. [DONZO!] Scanning many users at once

# Contributions

- Make an issue
- Send a pull request