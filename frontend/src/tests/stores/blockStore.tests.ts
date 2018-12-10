import * as chai from "chai";
const expect = chai.expect;

import {BLOCK_TYPES} from "../../app/constants/blocks";
import { TextBlock } from "../../app/stores/models/Block";
import { RootStore } from "../../app/stores/RootStore";
import {SearchDirection, InsertWhere} from "../../app/interfaces";


export function getInitialState(): RootStore {
  const root = new RootStore();
  root.blockStore.setBlocks([
    {uid: "section1", proposalId: 42, type: BLOCK_TYPES.Section, data: {value: ""}},
    {uid: "block1", proposalId: 42, type: BLOCK_TYPES.Paragraph, data: {value: ""}},
    {uid: "subsection1", proposalId: 42, type: BLOCK_TYPES.Subtitle, data: {value: "subsection1"}},
    {uid: "block3", proposalId: 42, type: BLOCK_TYPES.Paragraph, data: {value: "<b>block3</b>"}},
    {uid: "block4", proposalId: 42, type: BLOCK_TYPES.Paragraph, data: {value: "block4"}},
    {uid: "section2", proposalId: 42, type: BLOCK_TYPES.Section},
    {uid: "block6", proposalId: 42, type: BLOCK_TYPES.UnorderedItem, data: {value: "ul"}},
    {uid: "block7", proposalId: 42, type: BLOCK_TYPES.OrderedItem, data: {value: "ol"}},
    {uid: "block8", proposalId: 42, type: BLOCK_TYPES.OrderedItem, data: {value: "ol2"}},
  ]);
  return root;
}

describe("BlockStore:", () => {
  describe("Adding blocks", () => {
    it("can add paragraph block in the middle", () => {
      const store = getInitialState();
      store.blockStore.addBlock("block1", BLOCK_TYPES.Paragraph , "hey");

      expect(store.blockStore.blocks.length).to.equal(10);
      const block: TextBlock = store.blockStore.blocks[2];
      expect(block.type).to.equal(BLOCK_TYPES.Paragraph);
      expect(block.data.value).to.equal("hey");
      expect(block.proposalId).to.equal(42);
      expect(store.editorStore.blockToFocus.uid).to.equal(block.uid);
      expect(store.editorStore.blockToFocus.position).to.equal(0);

      // Check ordering is correct
      const uids = store.blockStore.blocks.map(x => x.uid);
      expect(uids).to.deep.equal(
        ["section1", "block1", block.uid, "subsection1", "block3",
          "block4", "section2", "block6", "block7", "block8"]
      );
    });

    it("can add paragraph block at the end", () => {
      const store = getInitialState();
      store.blockStore.addBlock("block8", BLOCK_TYPES.Paragraph , "hey");

      expect(store.blockStore.blocks.length).to.equal(10);
      const block: TextBlock = store.blockStore.blocks[9];
      expect(block.type).to.equal(BLOCK_TYPES.Paragraph);
      expect(block.data.value).to.equal("hey");
      expect(store.editorStore.blockToFocus.uid).to.equal(block.uid);
      expect(store.editorStore.blockToFocus.position).to.equal(0);

      // Check ordering is correct
      const uids = store.blockStore.blocks.map(x => x.uid);
      expect(uids).to.deep.equal(
        ["section1", "block1", "subsection1", "block3",
          "block4", "section2", "block6", "block7", "block8", block.uid]
      );
    });
  });

  describe("Turning blocks into X", () => {
    it("should work", () => {
      const store = getInitialState();
      store.blockStore.turnInto("block1", {type: BLOCK_TYPES.UnorderedItem});
      expect(store.blockStore.blocks[1].type).to.equal(BLOCK_TYPES.UnorderedItem);

    });
  });

  describe("Removing blocks", () => {
    it("can delete only one block", () => {
      const store = getInitialState();
      store.blockStore.removeSingleBlock("section2");

      expect(store.blockStore.blocks.length).to.equal(8);
      expect(store.editorStore.blockToFocus.uid).to.equal("block4");
      expect(store.editorStore.blockToFocus.position).to.equal(6);
      const uids = store.blockStore.blocks.map(x => x.uid);
      expect(uids).to.deep.equal(
        ["section1", "block1", "subsection1", "block3", "block4", "block6", "block7", "block8"]
      );
    });

    it("can delete a section and its content", () => {
      const store = getInitialState();
      store.blockStore.removeContainer("section2");

      expect(store.blockStore.blocks.length).to.equal(5);
      expect(store.editorStore.blockToFocus.uid).to.equal("block4");
      expect(store.editorStore.blockToFocus.position).to.equal(6);
      const uids = store.blockStore.blocks.map(x => x.uid);
      expect(uids).to.deep.equal(
        ["section1", "block1", "subsection1", "block3", "block4"]
      );
    });

    it("can delete a subsection and its content", () => {
      const store = getInitialState();
      store.blockStore.removeContainer("subsection1");

      expect(store.blockStore.blocks.length).to.equal(6);
      const uids = store.blockStore.blocks.map(x => x.uid);
      expect(uids).to.deep.equal(
        ["section1", "block1", "section2", "block6", "block7", "block8"]
      );
    });
  });

  describe("Updating text", () => {
    it("should work for `value`", () => {
      const store = getInitialState();
      store.blockStore.updateText("block1", "Hello world");
      expect(store.blockStore.blocks[1].data.value).to.equal("Hello world");
    });

    it("should work for `caption`", () => {
      const store = getInitialState();
      store.blockStore.turnInto("block1", {type: BLOCK_TYPES.Quote});
      store.blockStore.updateText("block1", "Hello world", true);
      expect(store.blockStore.blocks[1].data.caption).to.equal("Hello world");
    });
  });

  describe("Merge with previous", () => {
    it("should do nothing on first block", () => {
      const store = getInitialState();
      store.blockStore.mergeWithPrevious("section1");
      expect(store.blockStore.blocks.length).to.equal(9);
      expect(store.blockStore.blocks[0].data.value).to.equal("");
    });

    it("can merge 2 paragraphs", () => {
      const store = getInitialState();
      store.blockStore.mergeWithPrevious("block4");
      expect(store.blockStore.blocks.length).to.equal(8);
      expect(store.blockStore.blocks[3].data.value).to.equal("<b>block3</b>block4");
      expect(store.editorStore.blockToFocus.uid).to.equal("block3");
      expect(store.editorStore.blockToFocus.position).to.equal(6);
    });

    it("can merge a ol into a ul", () => {
      const store = getInitialState();
      store.blockStore.mergeWithPrevious("block7");
      expect(store.blockStore.blocks.length).to.equal(8);
      expect(store.blockStore.blocks[6].data.value).to.equal("ulol");
      expect(store.editorStore.blockToFocus.uid).to.equal("block6");
      expect(store.editorStore.blockToFocus.position).to.equal(2);
    });

    it("can merge a paragraph into a header", () => {
      const store = getInitialState();
      store.blockStore.mergeWithPrevious("block3");
      expect(store.blockStore.blocks.length).to.equal(8);
      expect(store.blockStore.blocks[2].data.value).to.equal("subsection1<b>block3</b>");
      expect(store.editorStore.blockToFocus.uid).to.equal("subsection1");
      expect(store.editorStore.blockToFocus.position).to.equal(11);
    });
  });

  describe("Batch add", () => {
    it("should replace the current block if asked", () => {
      const store = getInitialState();
      const blocksData = [
        {type: BLOCK_TYPES.Paragraph, uid: `paste1`, data: { value: "1"} },
        {type: BLOCK_TYPES.Subtitle, uid: `paste2`, data: { value: "2"} },
      ];
      store.blockStore.batchAdd("block1", blocksData, true);
      expect(store.blockStore.blocks.length).to.equal(10);
      expect(store.blockStore.blocks[1].proposalId).to.equal(42);
      // Check ordering is correct
      const uids = store.blockStore.blocks.map(x => x.uid);
      expect(uids).to.deep.equal(
        ["section1", "paste1", "paste2", "subsection1", "block3",
          "block4", "section2", "block6", "block7", "block8"]
      );
      expect(store.editorStore.blockToFocus.uid).to.equal("paste2");
      expect(store.editorStore.blockToFocus.position).to.equal(0);
    });

    it("should add after the block if not replacing", () => {
      const store = getInitialState();
      const blocksData = [
        {type: BLOCK_TYPES.Paragraph, uid: `paste1`, data: { value: "1"} },
        {type: BLOCK_TYPES.Subtitle, uid: `paste2`, data: { value: "2"} },
      ];
      store.blockStore.batchAdd("block1", blocksData, false);
      expect(store.blockStore.blocks.length).to.equal(11);
      expect(store.blockStore.blocks[3].proposalId).to.equal(42);
      // Check ordering is correct
      const uids = store.blockStore.blocks.map(x => x.uid);
      expect(uids).to.deep.equal(
        ["section1", "block1", "paste1", "paste2", "subsection1",
          "block3", "block4", "section2", "block6", "block7", "block8"]
      );
      expect(store.editorStore.blockToFocus.uid).to.equal("paste2");
      expect(store.editorStore.blockToFocus.position).to.equal(0);
    });
  });

  describe("Adding empty paragraph when needed", () => {
    it("should add a paragraph when nothing after a cost table", () => {
      const store = getInitialState();
      store.blockStore.turnInto("block8", {type: BLOCK_TYPES.CostTable, currency: "GBP"});
      // It should have added a block at the end
      expect(store.blockStore.blocks.length).to.equal(10);
      expect(store.blockStore.blocks[9].type).to.equal(BLOCK_TYPES.Paragraph);
    });

    it("should add a paragraph when nothing between a signature and a divider", () => {
      const store = getInitialState();
      store.blockStore.turnInto("block4", {type: BLOCK_TYPES.CostTable, currency: "GBP"});
      store.blockStore.turnInto("block3", {type: BLOCK_TYPES.Divider});
      // It should have added a block in between block3 and block4
      expect(store.blockStore.blocks.length).to.equal(10);
      expect(store.blockStore.blocks[4].type).to.equal(BLOCK_TYPES.Paragraph);
    });
  });

  // TODO: move to EditorStore tests
  describe("Focus", () => {
    it("should focusNext", () => {
      const store = getInitialState();
      store.editorStore.focusedBlockUid = "block3";
      store.blockStore.focusNext(103);
      expect(store.editorStore.blockToFocus.searchPixelPos).to.deep.equal(
        {start: 0, left: 103, direction: SearchDirection.FORWARD}
      );
    });

    it("should focusPrevious", () => {
      const store = getInitialState();
      store.editorStore.focusedBlockUid = "block3";
      store.blockStore.focusPrevious(105);
      // prev block is "subsection1"
      expect(store.editorStore.blockToFocus.searchPixelPos).to.deep.equal(
        {start: "subsection1".length - 1, left: 105, direction: SearchDirection.BACKWARD}
      );
    });

    it("focusedBlockUid not changed on focus change", () => {
      const store = getInitialState();
      store.blockStore.focusPrevious(105);
      expect(store.editorStore.focusedBlockUid).to.be.null;
    });
  });

  describe("DND", () => {
    it("should dnd a section up", () => {
      const store = getInitialState();
      store.blockStore.dropBlockOn("section2", "subsection1", InsertWhere.Above);
      expect(store.blockStore.blocks.length).to.equal(getInitialState().blockStore.blocks.length);
      expect(store.blockStore.blocks[2].uid).to.equal("section2");
      expect(store.blockStore.blocks[3].uid).to.equal("block6");
    });

    it("should dnd a subtitle down", () => {
      const store = getInitialState();
      store.blockStore.dropBlockOn("subsection1", "block6", InsertWhere.Below);
      expect(store.blockStore.blocks.length).to.equal(getInitialState().blockStore.blocks.length);
      expect(store.blockStore.blocks[2].uid).to.equal("section2");
      expect(store.blockStore.blocks[6].uid).to.equal("block4");
      expect(store.blockStore.blocks[7].uid).to.equal("block7");
    });
  });
});
