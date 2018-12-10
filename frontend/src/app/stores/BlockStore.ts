import { observable, action, computed, ObservableMap } from "mobx";
import { findIndex, zip, isEqual } from "lodash";

import { BLOCK_TYPES } from "../constants/blocks";
import {
  Block, TextBlock, TurnIntoPayload, CostTableSection, CostTableBlock,
  TableBlock,
} from "./models/Block";
import { correctNow } from "../utils/dates";
import { isTextBlock, needsFillerBlock, isHeaderBlock, headerLevel } from "../utils/blocks";
import { htmlTextLength } from "../utils/html";
import fetchling from "../utils/fetchling";
import {SearchDirection, InsertWhere} from "../interfaces";
import {Store} from "./RootStore";


export class BlockStore extends Store {
  @observable blocks: Array<Block> = [];
  @observable blocksForMerge: Array<Block> = [];
  // needed so we can update the tables on merge from server
  // since table have a local version
  @observable tableVersions: ObservableMap<number> = new ObservableMap<number>();
  undoBlocks: Array<Block> = [];
  undoUid: string | null = null;

  // findIndex is apparently not on IE so using lodash
  findIndex(uid: string): number {
    return findIndex(this.blocks, b => b.uid === uid);
  }

  findBlock(uid: string): [number, Block] {
    const block = this.blocks.find(b => b.uid === uid);
    const ix = this.findIndex(uid);
    return [ix, block];
  }

  @computed get hasSignature(): boolean {
    return !!this.blocks.find(x => x.type === BLOCK_TYPES.Signature);
  }

  @computed get hasPayment(): boolean {
    return !!this.blocks.find(x => x.type === BLOCK_TYPES.Payment);
  }

  @computed get currentProposalId(): number {
    if (this.blocks.length > 0 && this.blocks[0].proposalId !== -1) {
      return this.blocks[0].proposalId;
    }
    return this.rootStore.proposalStore.current.id;
  }

  @computed get totalAmount(): number {
    let result = null;
    this.blocks.filter(x => x.type === BLOCK_TYPES.CostTable).map((b: CostTableBlock) => {
      result = result === null ? b.data.total : result + b.data.total;
    });
    return result || 0;
  }

  @computed get proposalCurrency(): string | null {
    let currency = null;
    this.blocks.filter(x => x.type === BLOCK_TYPES.CostTable).map((b: CostTableBlock) => {
      currency = b.data.currency;
    });
    if (currency === null) {
      currency = this.rootStore.companyStore.us.currency;
    }
    return currency;
  }

  @action clear() {
    this.blocks = [];
    this.blocksForMerge = [];
    this.undoBlocks = [];
  }

  @action setBlocks(data: Array<any>, blocksForMerge: Array<any> | null = null) {
    this.blocks = data.map(x => {
      // need to selectively update cost table version of those that changed
      // if we do to all of them we lose the focus on save
      if (x.type.indexOf([BLOCK_TYPES.CostTable, BLOCK_TYPES.Table]) > -1) {
        const block = this.findBlock(x.uid)[1];
        if (block && !isEqual(block.data, x.data)) {
          this.incrementTableVersion(x.uid);
        }
      }
      if (x.proposalId === -1) {
        x.proposalId = this.currentProposalId;
      }
      return new Block(x);
    });

    // Ensure we can't load a proposal without a block
    if (this.blocks.length === 0) {
      const block = new TextBlock("");
      block.proposalId = this.currentProposalId;
      this.blocks.push(block);
    }
    this.blocksForMerge = blocksForMerge !== null
      ? blocksForMerge.map(x => new Block(x))
      : data.map(x => new Block(x));
  }

  @action markForSaving() {
    this.insertFillerBlocks();
    this.rootStore.proposalStore.debouncedSave();
  }

  @action saveBlock(block: Block, ix: number, noFiller = false) {
    block.version = correctNow();
    this.blocks[ix] = block;
    // whether we want to append filler, ie when writing text we don't want to do it
    if (!noFiller) {
      this.markForSaving();
    } else {
      this.rootStore.proposalStore.debouncedSave();
    }
  }

  // Goes through all the blocks and insert an empty paragraph
  // if needed after cost table/signature/divider
  @action insertFillerBlocks() {
    const blockData = {
      type: BLOCK_TYPES.Paragraph,
      proposalId: this.currentProposalId,
      version: correctNow(),
    };

    if (!this.currentProposalId) {
      return;
    }

    // nothing left
    if (this.blocks.length === 0) {
      this.blocks.push(new TextBlock(blockData));
      return;
    }

    // only one block and one that needs a filler
    if (this.blocks.length === 1 && needsFillerBlock(this.blocks[0].type)) {
      this.blocks.push(new TextBlock(blockData));
      return;
    }

    for (let i = 1; i < this.blocks.length; i++) {
      const prev = this.blocks[i - 1];
      const curr = this.blocks[i];
      // Shouldn't be needed but better safe than IntegrityError
      if (curr.proposalId === -1) {
        curr.proposalId = this.currentProposalId;
      }
      // if the previous block needs one
      if (needsFillerBlock(prev.type) && !isTextBlock(curr.type)) {
        this.blocks.splice(i, 0, new TextBlock(blockData));
      }
      // if the last block needs one
      if (i === this.blocks.length - 1 && needsFillerBlock(curr.type)) {
        this.blocks.push(new TextBlock(blockData));
      }
    }
  }

  @action turnInto(uid: string, payload: TurnIntoPayload, clearContent = false) {
    const [ix, block] = this.findBlock(uid);
    if (block) {
      block.turnInto(payload, clearContent);
      this.saveBlock(block, ix);
      // Browser loses focus when changing the element type but store
      // thinks element with UUID uid is still focused. Force focus change
      // by pretending nothing is focused at the moment:
      this.rootStore.editorStore.setFocusedBlock(null);
      if (block.type === BLOCK_TYPES.Payment) {
        this.updatePaymentAmount();
      }
      // UX tweak: focus on the next block if you can't focus the current block
      if ([BLOCK_TYPES.Divider, BLOCK_TYPES.Signature].indexOf(block.type) > -1) {
        if (ix + 1 < this.blocks.length) {
          const nextBlock = this.blocks[ix + 1];
          this.rootStore.editorStore.focusOnBlock(nextBlock.uid, 0, null);
        }
      } else {
        // focus on block we just changed otherwise
        this.rootStore.editorStore.focusOnBlock(block.uid, 0, block.type);
      }
    }
  }

  // Used to add paragraph and list items blocks when pressing enter
  @action addBlock(addAfterUid: string, type: string, value = "") {
    const ix = this.findIndex(addAfterUid);
    if (ix !== -1) {
      const block = new TextBlock({type, proposalId: this.currentProposalId}, value);
      this.blocks.splice(ix + 1, 0, block);
      this.rootStore.editorStore.focusOnBlock(block.uid, 0, null);
      this.markForSaving();
    }
  }

  // Delete a single block
  @action removeSingleBlock(uid: string) {
    const ix = this.findIndex(uid);
    if (ix !== -1) {
      const toFocus = ix > 0 ? this.blocks[ix - 1] : null;
      this.blocks.splice(ix, 1);
      if (toFocus) {
        this.rootStore.editorStore.focusOnBlock(toFocus.uid, htmlTextLength(toFocus.data.value), null);
      }
      this.markForSaving();
    }
  }

  // Delete a section, subtitle or h3
  @action removeContainer(uid: string) {
    const [ix, block] = this.findBlock(uid);
    const toFocus = ix > 0 ? this.blocks[ix - 1] : null;

    // Find index of the next section or subsection
    const nextSectionIx = (kinds: Array<string>) => {
      const nextIx = findIndex(this.blocks, (x, i) => kinds.indexOf(x.type) > - 1 && i > ix);
      return nextIx === -1 ? this.blocks.length : nextIx;
    };

    let removeCount = 1;
    if (block.type === BLOCK_TYPES.Section) {
      removeCount = nextSectionIx([BLOCK_TYPES.Section]) - ix;
    } else if (block.type === BLOCK_TYPES.Subtitle) {
      removeCount = nextSectionIx([BLOCK_TYPES.Section, BLOCK_TYPES.Subtitle]) - ix;
    } else if (block.type === BLOCK_TYPES.H3) {
      removeCount = nextSectionIx([BLOCK_TYPES.Section, BLOCK_TYPES.Subtitle, BLOCK_TYPES.H3]) - ix;
    }

    this.undoBlocks = this.blocks.slice();
    this.undoUid = uid;
    this.blocks.splice(ix, removeCount);
    if (toFocus) {
      this.rootStore.editorStore.focusOnBlock(toFocus.uid, htmlTextLength(toFocus.data.value), null);
    }
    this.rootStore.uiStore.notify("Undo?", false, true);
    this.markForSaving();
  }

  @action undo() {
    this.blocks = this.undoBlocks;
    this.undoBlocks = [];
    this.rootStore.editorStore.setFocusedBlock(this.undoUid);
    this.undoUid = null;
    this.rootStore.uiStore.hideNotification();
  }

  @action removeWithUndo(uid: string) {
    // we only care about the block, not the ix
    const block = this.findBlock(uid)[1];
    // removeContainer already set things up for undo
    if (isHeaderBlock(block.type)) {
      this.removeContainer(uid);
    } else {
      this.undoBlocks = this.blocks.slice();
      this.undoUid = uid;
      this.removeSingleBlock(uid);
    }
    this.rootStore.uiStore.notify("Undo?", false, true);
  }

  @action updateText(uid: string, newValue: string, isCaption = false) {
    const [ix, block] = this.findBlock(uid);
    if (isCaption) {
      block.data.caption = newValue;
    } else {
      block.data.value = newValue;
    }

    // check value for inline block changer stuff
    if (block.type === BLOCK_TYPES.Paragraph) {
      this.rootStore.editorStore.updateBlockChanger(uid, newValue);
    }

    this.saveBlock(block, ix);
  }

  @action setEmbedUrl(uid: string, url: string) {
    const [ix, block] = this.findBlock(uid);
    block.data.url = url;
    block.data.caption = "";
    this.saveBlock(block, ix);
  }

  @action updateQuote(uid: string, quote: string, caption: string) {
    const [ix, block] = this.findBlock(uid);
    block.data.quote = quote;
    block.data.source = caption;
    this.saveBlock(block, ix);
  }

  // Merge the block with uid with its predecessor if possible
  @action mergeWithPrevious(uid: string) {
    const [ix, block] = this.findBlock(uid);
    // can't do anything on first block or blocks not found
    if (ix <= 0) {
      return;
    }
    const prevBlock = this.blocks[ix - 1];

    // merging only works on block types
    if (!isTextBlock(prevBlock.type) || !isTextBlock(block.type)) {
      return;
    }
    const prevValue = prevBlock.data.value;
    prevBlock.data.value = prevBlock.data.value + block.data.value;
    this.saveBlock(prevBlock, ix - 1);
    this.blocks.splice(ix, 1);
    this.markForSaving();
    this.rootStore.editorStore.focusOnBlock(prevBlock.uid, htmlTextLength(prevValue), null);
  }

  @action batchAdd(uid: string, blocksData: Array<any>, replaceCurrent: boolean) {
    const blocks = blocksData.map(b => {
      b.proposalId = this.currentProposalId;
      b.version = correctNow();
      return new Block(b);
    });
    const where = this.findIndex(uid) + (replaceCurrent ? 0 : 1);
    const removeCount = replaceCurrent ? 1 : 0;
    this.blocks.splice(where, removeCount, ...blocks);
    this.rootStore.editorStore.focusOnBlock(blocks[blocks.length - 1].uid, 0, null);
    this.markForSaving();
  }

  @action importSection(insertAtUid: string, uidToImport: string): Promise<any> {
    return fetchling(`/proposals/${this.rootStore.proposalStore.current.id}/sections/import`).post(
      { uidToImport },
    ).then((result: any) => this.batchAdd(insertAtUid, result.blocks, true))
      .catch(() => this.rootStore.uiStore.notify("Error importing sections. Please try again later", true));
  }

  // focusNext and focusPrevious should probably go into EditorStore
  @action focusNext(left: number) {
    const ix = this.findIndex(this.rootStore.editorStore.focusedBlockUid);
    if (ix === -1 || ix === this.blocks.length - 1) {
      return;
    }
    const b = this.blocks[ix + 1];
    this.rootStore.editorStore.focusOnBlock(b.uid, 0, b.type, {start: 0, left, direction: SearchDirection.FORWARD});
  }

  @action focusPrevious(left: number) {
    const ix = this.findIndex(this.rootStore.editorStore.focusedBlockUid);
    if (ix === -1 || ix === 0) {
      return;
    }
    const b = this.blocks[ix - 1];
    // TODO: the -1 isn't technically correct but we can't seem to set
    // the range to the end without special handling. We could
    // e.g. introduce a constant `END = 1e12` which then triggers
    // `collapseToEnd`?
    const len = htmlTextLength(b.data.value || "") - 1;
    this.rootStore.editorStore.focusOnBlock(b.uid, 0, b.type, {start: len, left, direction: SearchDirection.BACKWARD});
  }

  @action setCurrencyCostTable(uid: string, currency: string) {
    const [ix, block] = this.findBlock(uid);
    if (block) {
      const block2 = block.asCostTableBlock();
      block2.data.currency = currency;
      this.saveBlock(block2, ix, true);
      this.incrementTableVersion(uid);
    }
  }

  @action setHeadersCostTable(uid: string, headers: Array<string>) {
    const [ix, block] = this.findBlock(uid);
    if (block) {
      const block2 = block.asCostTableBlock();
      block2.data.headers = headers;
      this.saveBlock(block2, ix, true);
    }
  }

  @action setLabelCostTable(uid: string, label: string, value: string) {
    const [ix, block] = this.findBlock(uid);
    if (block) {
      const block2 = block.asCostTableBlock();
      block2.data[label] = value;
      this.saveBlock(block2, ix, true);
    }
  }

  @action setDiscountCostTable(uid: string, value: string) {
    const [ix, block] = this.findBlock(uid);
    if (block) {
      block.data.discount = value;
      // TODO: instantiate correctly so we already have a CostTableBlock instance
      // in the first place
      const block2 = block.asCostTableBlock();
      block2.recompute();
      this.updatePaymentAmount();
      this.saveBlock(block2, ix);
      this.incrementTableVersion(uid);
    }
  }

  @action saveSectionCostTable(uid: string, index: number, section: CostTableSection) {
    const [ix, block] = this.findBlock(uid);
    if (block) {
      block.data.sections[index] = section;
      const block2 = block.asCostTableBlock();
      block2.recompute();
      this.updatePaymentAmount();
      this.saveBlock(block2, ix, true);
    }
  }

  @action addSectionCostTable(uid: string, index: number) {
    const [ix, block] = this.findBlock(uid);
    if (block) {
      const block2 = block.asCostTableBlock();
      block2.data.sections.splice(index + 1, 0, new CostTableSection());
      block2.recompute();
      this.updatePaymentAmount();
      this.saveBlock(block2, ix, true);
      this.incrementTableVersion(uid);
    }
  }

  @action removeSectionCostTable(uid: string, index: number) {
    const [ix, block] = this.findBlock(uid);
    if (block) {
      const block2 = block.asCostTableBlock();
      block2.data.sections.splice(index, 1);
      block2.recompute();
      this.updatePaymentAmount();
      this.saveBlock(block2, ix, true);
      this.incrementTableVersion(uid);
    }
  }

  // direction == -1 -> move up, direction == 1 -> move down
  @action moveSectionCostTable(uid: string, index: number, direction: number) {
    const [ix, block] = this.findBlock(uid);
    if (block) {
      const block2 = block.asCostTableBlock();
      const toSwap = block2.data.sections[index + direction];
      block2.data.sections[index + direction] = block2.data.sections[index];
      block2.data.sections[index] = toSwap;
      block2.recompute();
      this.updatePaymentAmount();
      this.saveBlock(block2, ix, true);
      this.incrementTableVersion(uid);
    }
  }

  @action incrementTableVersion(uid: string) {
    this.tableVersions.set(uid, this.getTableVersion(uid) + 1);
  }

  getTableVersion(uid: string) {
    return this.tableVersions.get(uid) || 0;
  }

  // DND
  @action dropBlockOn(uid: string, targetUid: string, insertWhere: InsertWhere) {
    const [blockIx, block] = this.findBlock(uid);
    const targetIx = this.findIndex(targetUid);
    // block can be undefined in some cases according to sentry
    if (targetIx === -1 || !block) {
      // drag onto ourselves or other invalid drags need to be filtered
      // out because the code below assumes that we have a valid targetBlockIx.
      return;
    }
    const version = correctNow();
    const offset = insertWhere === InsertWhere.Above ? 0 : 1;

    // dropping a normal block just splice things up
    if (!isHeaderBlock(block.type)) {
      this.blocks.splice(blockIx, 1);
      block.version = version;
      this.blocks.splice(targetIx + offset + (blockIx < targetIx ? -1 : 0), 0, block);
      this.markForSaving();
      return;
    }
    // Find next subsection of same header level as us - any content up to
    // that point will be moved.
    const myLevel = headerLevel(block.type);

    const movePositions: Array<number> = this.blocks
      .map((x, i) => headerLevel(x.type) <= myLevel ? i : null)
      .filter(x => x !== null);
    // Take into account moving the last thing
    movePositions.push(this.blocks.length);
    const myPosition = movePositions.indexOf(blockIx);

    // what to take along
    const a = movePositions[myPosition];
    const b = movePositions[myPosition + 1];
    const delta = b - a;
    const blocksToMove = this.blocks.slice(a, a + delta);

    // where to move
    // NB we cut first so if we move below ourselves we need to deduct
    // our own height from the move position
    const newPos = targetIx + offset + (a < targetIx ? -delta : 0);

    function updatePositionVersions(allBlocks: Array<Block>, blocks: Array<Block>): Array<Block> {
      // This function updates the versions of all blocks that have been moved
      return zip(allBlocks, blocks).map(
        ([x, y]) => {
          if (!isEqual(x, y)) {
            y.version = version;
          }
          return y;
        });
    }

    // execute
    const cut = this.blocks.slice();
    cut.splice(a, delta);
    cut.splice(newPos, 0, ...blocksToMove);
    this.blocks = updatePositionVersions(this.blocks, cut);
    this.markForSaving();
  }

  // Tries to find a payment block and updates it if it finds one and its amount is not forced
  @action updatePaymentAmount() {
    const block = this.blocks.find(b => b.type === BLOCK_TYPES.Payment);
    if (!block || block.data.amountIsForced) {
      return;
    }
    const ix = this.findIndex(block.uid);
    block.data.amount = this.totalAmount;
    this.saveBlock(block, ix, true);
  }

  @action forcePaymentAmount(uid: string, amount: number) {
    const [ix, block] = this.findBlock(uid);
    block.data.amount = amount;
    block.data.amountIsForced = true;
    this.saveBlock(block, ix);
  }

  @action changePaymentPercentage(uid: string, percentage: number) {
    const [ix, block] = this.findBlock(uid);
    block.data.percentage = percentage;
    this.saveBlock(block, ix);
  }

  // Normal table
  @action updateTable(table: TableBlock) {
    const [ix, block] = this.findBlock(table.uid);
    if (block) {
      this.saveBlock(table, ix, true);
      this.incrementTableVersion(table.uid);
    }
  }
}
