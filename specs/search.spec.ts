const objects = [
  {
    color: "red",
    value: "#f00"
  },
  {
    color: "green",
    value: "#0f0"
  },
  {
    color: "blue",
    value: "#00f"
  },
  {
    color: "cyan",
    value: "#0ff"
  },
  {
    color: "magenta",
    value: "#f0f"
  },
  {
    color: "yellow",
    value: "#ff0"
  },
  {
    color: "black",
    value: "#000"
  }
];

// @ts-ignore
const credentials = {
  engineId: `${process.env.CLINIA_ENGINE_ID_1}`,
  apiKey: `${process.env.CLINIA_SEARCH_KEY_1}`
};

// @ts-ignore
const version = require("../lerna.json").version;


["clinia-lite.com", "clinia.com"].forEach(preset => {
  describe(`search features - ${preset}`, () => {
    beforeEach(async () => browser.url(preset));

    it("searchClient::search and searchIndex::search", async () => {
      const results = await browser.executeAsync(function(credentials, done) {
        const client = clinia(credentials.engineId, credentials.apiKey);

        const index = client.initIndex("health_facility");

        Promise.all([
          index.search(""),
          index.search("red"),
          index.search("black")
        ]).then(done);
      }, credentials);

      expect(results[0].meta.total).toBe(objects.length);

      expect(results[1].hits.pop().value).toEqual("#f00");
      expect(results[1].nbHits).toBe(1);

      expect(results[2].hits.pop().value).toEqual("#000");
      expect(results[2].nbHits).toBe(1);
    });

    it("cache requests", async () => {
      const responses = await browser.executeAsync(function(credentials, done) {
        const client = clinia(credentials.engineId, credentials.apiKey);
        const params = [
          {
            indexName: "javascript-browser-testing-lite",
            params: { clickAnalytics: "true" }
          }
        ];
        const promise = client.search(params);
        const promise2 = client.search(params);
        const promise3 = client.search(params, { cacheable: false });

        return Promise.all([promise, promise2, promise3]).then(done);
      }, credentials);

      expect(responses.length).toBe(3);
      const queryID = responses[0].results[0].queryID;
      const queryID2 = responses[1].results[0].queryID;
      const queryID3 = responses[2].results[0].queryID;
      expect(queryID).toBe(queryID2);

      // because is not cacheable
      expect(queryID2 === queryID3).toBe(false);
    });

    it("cache responses", async () => {
      const responses = await browser.executeAsync(function(credentials, done) {
        const client = clinia(credentials.engineId, credentials.apiKey);
        const params = [
          {
            indexName: "javascript-browser-testing-lite",
            params: { clickAnalytics: "true" }
          }
        ];
        return client
          .search(params)
          .then(function(response) {
            return Promise.all([response, client.search(params)]);
          })
          .then(done);
      }, credentials);

      expect(responses.length).toBe(2);
      const queryID = responses[0].results[0].queryID;
      const queryID2 = responses[1].results[0].queryID;
      expect(queryID).toBe(queryID2);
    });


    it("contains version", async () => {
      const browserVersion: string = await browser.executeAsync(function(done) {
        done(clinia.version);
      });
      
      expect(browserVersion).toBe(version);
      expect(browserVersion.startsWith('2.')).toBe(true);
    });
  });
});
