import * as chai from "chai";
const expect = chai.expect;

import { mergeBlocks } from "../../app/utils/merge";
import { TextBlock } from "../../app/stores/models/Block";


const docA = [
  new TextBlock({uid: "uid_1", version: 0}),
  new TextBlock({uid: "uid_2", version: 1}),
];

const docAFlipped = [
  new TextBlock({uid: "uid_2", version: 2}),
  new TextBlock({uid: "uid_1", version: 1}),
];

const docB = [
  new TextBlock({uid: "uid_1", version: 1}),
  new TextBlock({uid: "uid_3", version: 2}),
];

const docC = [
  new TextBlock({uid: "uid_1", version: 1}),
  new TextBlock({uid: "uid_2", version: 1}),
];

const docD = [
  new TextBlock({uid: "uid_3", version: 1}),
  new TextBlock({uid: "uid_2", version: 1}),
];

const docE = [
  new TextBlock({uid: "uid_2", version: 0}),
];

const docAthenD = [
  new TextBlock({uid: "uid_3", version: 1}),
  new TextBlock({uid: "uid_1", version: 0}),
  new TextBlock({uid: "uid_2", version: 1}),
];

describe("Merge:", () => {

  it("is symmetric ", () => {
    expect(mergeBlocks(docA, docA, docB)).to.deep.equal(docB);
    expect(mergeBlocks(docA, docB, docA)).to.deep.equal(docB);

    expect(mergeBlocks(docB, docB, docA)).to.deep.equal(docC);
    expect(mergeBlocks(docB, docA, docB)).to.deep.equal(docC);
  });


  it("orders correctly on collision ", () => {
    expect(mergeBlocks(docE, docA, docD)).to.deep.equal(docAthenD);
  });

  it("orders correctly on flip ", () => {
    expect(mergeBlocks(docA, docA, docAFlipped)).to.deep.equal(docAFlipped);
  });

});
