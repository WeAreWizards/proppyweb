import * as chai from "chai";
const expect = chai.expect;

import {BLOCK_TYPES} from "../../app/constants/blocks";
import {
  multiply,
  Block,
  ImageBlock,
  EmbedBlock,
  QuoteBlock,
  TextBlock,
  CostTableBlock,
  DividerBlock,
  SignatureBlock,
} from "../../app/stores/models/Block";


describe("Block model:", () => {
  describe("turnInto", () => {

    it("should work for images", () => {
      const url = "http://proppy.io";
      const b = new Block({});
      b.turnInto({type: BLOCK_TYPES.Image, url});
      expect(b.type).to.equal(BLOCK_TYPES.Image);
      expect((<ImageBlock>b).data.url).to.equal(url);
      expect((<ImageBlock>b).data.caption).to.equal("");
    });

    it("should work for embed", () => {
      const b = new Block({});
      b.turnInto({type: BLOCK_TYPES.Embed});
      expect(b.type).to.equal(BLOCK_TYPES.Embed);
      expect((<EmbedBlock>b).data.url).to.equal("");
      expect((<EmbedBlock>b).data.caption).to.equal("");
    });

    it("should work for quotes", () => {
      const b = new Block({});
      b.turnInto({type: BLOCK_TYPES.Quote});
      expect(b.type).to.equal(BLOCK_TYPES.Quote);
      expect((<QuoteBlock>b).data.quote).to.equal("");
      expect((<QuoteBlock>b).data.source).to.equal("");
    });

    it("should work for text blocks", () => {
      const b = new Block({});
      b.turnInto({type: BLOCK_TYPES.UnorderedItem});
      expect(b.type).to.equal(BLOCK_TYPES.UnorderedItem);
      expect((<TextBlock>b).data.value).to.equal("");
    });

    it("should work for divider blocks", () => {
      const b = new Block({});
      b.turnInto({type: BLOCK_TYPES.Divider});
      expect(b.type).to.equal(BLOCK_TYPES.Divider);
      expect((<DividerBlock>b).data).to.deep.equal({});
    });

    it("should work for signature blocks", () => {
      const b = new Block({});
      b.turnInto({type: BLOCK_TYPES.Signature});
      expect(b.type).to.equal(BLOCK_TYPES.Signature);
      expect((<SignatureBlock>b).data.name).to.equal("");
      expect((<SignatureBlock>b).data.date).to.equal(0);
      expect((<SignatureBlock>b).data.signature).to.equal("");
    });

    it("should work for text blocks with clearing content", () => {
      const b = new Block({data: {value: "/"}});
      b.turnInto({type: BLOCK_TYPES.UnorderedItem}, true);
      expect(b.type).to.equal(BLOCK_TYPES.UnorderedItem);
      expect((<TextBlock>b).data.value).to.equal("");
    });

    it("should work for headers blocks and remove html tags", () => {
      const b = new Block({data: {value: "<b>Hey</b>"}});
      b.turnInto({type: BLOCK_TYPES.Subtitle});
      expect(b.type).to.equal(BLOCK_TYPES.Subtitle);
      expect((<TextBlock>b).data.value).to.equal("Hey");
    });

    it("should work for cost table", () => {
      const b = new Block({});
      b.turnInto({type: BLOCK_TYPES.CostTable, currency: "GBP"});
      expect(b.type).to.equal(BLOCK_TYPES.CostTable);
      expect((<CostTableBlock>b).data.currency).to.equal("GBP");
      expect((<CostTableBlock>b).data.sections[0].rows.length).to.equal(1);
      expect((<CostTableBlock>b).data.sections[0].rows[0].length).to.equal(4);
    });
  });

  describe("multiply:", () => {
    it("should work for 2 valid numbers", () => {
      const result = multiply("2", "40");
      expect(result).to.equal(80);
    });

    it("should return null if one of the numbers is invalid", () => {
      const result = multiply("2", "as");
      expect(result).to.equal(null);
    });
  });
});
