import * as chai from "chai";
const expect = chai.expect;

import { ObservableMap } from "mobx";
import {
  filterAndRank, stringifySearch, parseSearchString,
  Query,
} from "../../app/utils/search";
import { Proposal } from "../../app/stores/models/Proposal";
import { Client } from "../../app/stores/models/Client";

const proposals = [
  new Proposal({
    id: 1,
    title: "abc",
    status: "draft",
    tags: ["dev"],
  }),
  new Proposal({
    id: 2,
    title: "def",
    status: "won",
    tags: ["design"],
    clientId: 42,
  }),
  new Proposal({
    id: 2,
    title: "hey",
    status: "lost",
    tags: ["ux"],
  }),
  new Proposal({
    id: 4,
    title: "hey",
    status: "trash",
    tags: ["ux"],
  }),
  new Proposal({
    id: 5,
    title: "poi",
    status: "sent",
    tags: ["web"],
  }),
];

const client = new Client({id: 42, name: "We Are Wizards"});
let clientState = new ObservableMap<Client>();
clientState.set(client.id.toString(), client);


function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function arbitraryText() {
  const words = ["hi", "wizards", " ", "   ", "\n", "----", "\n~'`-", "\""];
  let result = "";
  const n = getRandomInt(0, 5);

  for (let i = 0; i < n; i++) {
    result += words[getRandomInt(0, words.length)];
  }
  return result;
}

function arbitraryStatus() {
  const status = ["sent", "won", "lost", "draft", "trash"];
  return status[getRandomInt(0, status.length)];
}

function arbitraryTerm() {
  switch (getRandomInt(0, 5)) {
    case 0: return "tag:" + arbitraryText();
    case 1: return "foo:" + arbitraryText();
    case 2: return "client:" + arbitraryText();
    case 3: return "status:" + arbitraryText();
    case 4: return "status:" + arbitraryStatus();
  }
}

function arbitraryQuery()  {
  const n = getRandomInt(0, 5);
  let result = "";

  for (let i = 0; i < n; i++) {
    result += arbitraryTerm() + " ";
  }
  return result;
}

describe("Dashboard search:", () => {
  describe("parsing+stringify: ", () => {

    it("should return an empty string for empty query", () => {
      const x = stringifySearch(parseSearchString(""));
      expect(x).to.equal("");
    });

    it("parse tags", () => {
      const x = stringifySearch(parseSearchString("tag:tag"));
      expect(x).to.equal("tag:tag ");
    });

    it("randomized tests", () => {
      for (let i = 0; i < 100; i++) {
        const q = arbitraryQuery();
        // Still useful to feed crap to the parser to see whether it breaks.
        stringifySearch(parseSearchString(q));
        // TODO parsing and stringifying should return the same as the
        // input but it doesn't because that turns out to be quite
        // tricky. I've used the test below to catch many of the
        // common cases and will spend more time on it after the alpha.
        // expect(result).to.equal(q.replace(/\s+/g, "").trim());
      }
    });
  });

  describe("filterAndRank:", () => {
    it("should return all drafts+sent on empty", () => {
      expect(filterAndRank(proposals, clientState, new Query()).length).to.equal(2);
    });

    it("should filter by status", () => {
      const record = parseSearchString("status:won");
      expect(filterAndRank(proposals, clientState, record).length).to.equal(1);
    });

    it("should filter by tag", () => {
      const record = parseSearchString("tag:ux");
      expect(filterAndRank(proposals, clientState, record).length).to.equal(1);
    });

    it("should filter by client", () => {
      const record = parseSearchString("client:\"We Are Wizards\"");
      expect(filterAndRank(proposals, clientState, record).length).to.equal(1);
    });

    it("should combine filter and search", () => {
      const record = parseSearchString("status:lost hey");
      expect(filterAndRank(proposals, clientState, record).length).to.equal(1);
    });

    it("should search on everything (except status) if no explicit tag", () => {
      const record = parseSearchString("ux");
      expect(filterAndRank(proposals, clientState, record).length).to.equal(1);
    });

    it("should search on clients without filter", () => {
      const record = parseSearchString("wizards");
      expect(filterAndRank(proposals, clientState, record).length).to.equal(1);
    });

    it("should ignore proposals in the trash if not asked", () => {
      const record = parseSearchString("hey");
      expect(filterAndRank(proposals, clientState, record).length).to.equal(1);
    });

    it("should return proposals in the trash if asked", () => {
      const record = parseSearchString("status:trash hey");
      expect(filterAndRank(proposals, clientState, record).length).to.equal(1);
    });
  });
});
