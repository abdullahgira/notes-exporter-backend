# Notes exporter

Short description, goal and vision.

## Changelog

- **[07/16/022]**
  - Add youtube support
  - Parse youtube page using puppeteer
  - It expects timestamps to get the transcripts for
  - Skip interval is 10 seconds
  - If no transcript is available no results be shown
- **[07/14/022]**
  - Add pdf support
  - The nodejs app connects to a python service to extract highlights from the
    PDF, this is not done in nodejs, because nodejs is bad at this.
  - The url of the python service is stored in an env variable
- **[07/08/022]**
  - Add google books and coursera notes support
- **[07/07/022]**
  - Add notion support
