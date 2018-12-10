import * as uuid from "uuid";

import { BLOCK_TYPES } from "../../constants/blocks";

export type BlockType = "section" | "paragraph" | "subtitle" | "uli" | "oli"
    | "image" | "cost_table" | "signature" | "embed" | "divider" | "h3" | "quote" | "payment"
    | "table";

export type TurnIntoPayload = {type: string, url?: string, currency?: string};

export enum MoveDirection {
  Up,
  Down,
  Left,
  Right,
}

// We use some any in the base class to allow casting
export class Block {
  public uid: string = uuid.v4();
  public type: any = BLOCK_TYPES.Paragraph;
  public proposalId: number = -1;
  public version: number = 0;
  public data: any = {};

  constructor(json: any) {
    Object.assign(this, json);
  }

  clone() {
    return new Block({
      uid: this.uid,
      type: this.type,
      proposalId: this.proposalId,
      version: this.version,
      data: this.data,
    });
  }

  turnInto(payload: TurnIntoPayload, clearContent = false) {
    this.type = payload.type;

    switch (this.type as BlockType) {
      case BLOCK_TYPES.Embed:
        this.data = (new EmbedBlock({})).data;
        break;
      case BLOCK_TYPES.Image:
        this.data = (new ImageBlock({}, payload.url)).data;
        break;
      case BLOCK_TYPES.Quote:
        this.data = (new QuoteBlock({})).data;
        break;
      case BLOCK_TYPES.Paragraph:
      case BLOCK_TYPES.OrderedItem:
      case BLOCK_TYPES.UnorderedItem:
        // We only can turn text into text so we can assume we have a TextBlock
        this.data = {value: clearContent ? "" : (<TextBlock> this).data.value || ""};
        break;
      case BLOCK_TYPES.Subtitle:
      case BLOCK_TYPES.Section:
      case BLOCK_TYPES.H3:
        this.data = {value: clearContent ? "" : ((<TextBlock> this).data.value || "").replace(/(<([^>]+)>)/ig, "")};
        break;
      case BLOCK_TYPES.CostTable:
        this.data = (new CostTableBlock({}, payload.currency)).data;
        break;
      case BLOCK_TYPES.Divider:
        this.data = (new DividerBlock({})).data;
        break;
      case BLOCK_TYPES.Signature:
        this.data = (new SignatureBlock({})).data;
        break;
      case BLOCK_TYPES.Payment:
        this.data = (new PaymentBlock({})).data;
        this.data.percentage = 100;
        break;
      case BLOCK_TYPES.Table:
        this.data = (new TableBlock({})).data;
        break;
      default:
        throw new Error("Unknown block: " + this.type);
    }
  }

  recompute() {
    throw new Error("tried to recompute on a non cost table block");
  }

  asCostTableBlock(): CostTableBlock {
    const block = new CostTableBlock({}, "");
    block.uid = this.uid;
    block.version = this.version;
    block.proposalId = this.proposalId;
    block.data = this.data;
    block.data.sections = this.data.sections.map(s => new CostTableSection(s));
    return block;
  }

  asTableBlock(): TableBlock {
    const block = new TableBlock({});
    block.uid = this.uid;
    block.version = this.version;
    block.proposalId = this.proposalId;
    block.data = this.data;
    return block;
  }
}

export class TextBlock extends Block {
  public type: "paragraph" | "uli" | "oli" | "section" | "subtitle" | "h3";
  public data: {value: string};

  constructor(json: any, value = "") {
    super(json);
    this.data.value = value;
  }
}

export class QuoteBlock extends Block {
  public type: "quote";
  // Caption was introduced in the mobx transition but wasn't used elsewhere
  // now, some users have probably put source in quotes so we need to take both into account
  public data: {quote: string, source: string, caption: string} = {quote: "", source: "", caption: ""};
}

export class DividerBlock extends Block {
  public type: "divider" = "divider";
  public data: {} = {};
}

// Same as EmbedBlock for now but can be extended later on
export class ImageBlock extends Block {
  public type: "image" = "image";
  public data: {url: string, caption: string} = {url: "", caption: ""};

  constructor(json: any, url: string) {
    super(json);
    this.data.url = url;
  }
}

export class EmbedBlock extends Block {
  public type: "embed" = "embed";
  public data: {url: string, caption: string} = {url: "", caption: ""};
}

export class SignatureBlock extends Block {
  public type: "signature" = "signature";
  public data: {name: string, date: number, signature: string} = {name: "", date: 0, signature: ""};
}

// is that even needed
export function multiply(a: string, b: string): number {
  const aNum = parseFloat(a);
  const bNum = parseFloat(b);

  if (isNaN(aNum) || isNaN(bNum)) {
    return null;
  }
  return aNum * bNum;
}


// some people might put their currency symbol so let's try to remove them if possible
// The regex is not perfect (ie allows several .) but we go for the easy one
function sanitizeRate(val: string) {
  // val can be null or undefined if the user deleted everything in the rate cell
  if (!val) {
    return "";
  }
  return val.replace(/[^\d.-]/g, "");
}

function parseDiscount(v) {
  if (!isNaN(parseFloat(v))) {
    return parseFloat(v) / 100.0;
  }
  return 0.0;
}

export class CostTableSection {
  title: string;
  total: number;
  // rows of [desc, rate, qty, total]
  rows: Array<Array<any>>;

  constructor(json?: any) {
    if (json) {
      Object.assign(this, json);
    } else {
      this.title = "";
      this.total = 0;
      this.rows = [["", 0, 0, 0]];
    }
  }

  addRow() {
    this.rows.push(["", 0, 0, 0]);
  }

  calculateTotal() {
    let total = 0;
    this.rows.map(row => {
      row[3] = multiply(sanitizeRate(row[1]), row[2]);
      total += row[3];
    });
    this.total = total || 0;
  }

  clone() {
    return new CostTableSection(Object.assign({}, this));
  }
}

export class CostTableBlock extends Block {
  public type: "cost_table" = "cost_table";
  public data: {
    headers: Array<string>,
    sections: Array<CostTableSection>,
    version: number,
    currency: string,
    discount: string, // the discount typed by the user
    discountPercent: number,
    discountValue: number,
    subtotal: number,
    total: number,
    subtotalLabel: string,
    totalLabel: string,
    discountLabel: string,
  } = {
    headers: [null, null, null, null],
    sections: [new CostTableSection()],
    version: 0,
    currency: "GBP",
    discount: "",
    discountPercent: 0,
    discountValue: 0,
    subtotal: 0,
    total: 0,
    subtotalLabel: "Subtotal",
    totalLabel: "Total",
    discountLabel: "% discount",
  };

  constructor(json: any, currency: string) {
    super(json);
    this.data.currency = currency;
  }

  recompute() {
    let subtotal = 0;
    this.data.sections.map(section => {
      section.calculateTotal();
      subtotal += section.total;
    });
    this.data.subtotal = subtotal;
    const parsedDiscount = parseDiscount(this.data.discount);
    this.data.discountValue = Math.round(parsedDiscount * this.data.subtotal);
    this.data.discountPercent = parsedDiscount * 100;
    this.data.total = this.data.subtotal - this.data.discountValue;
  }
}

export class PaymentBlock extends Block {
  public type = "payment";
  public data: {
    provider?: "stripe",
    amount?: number,
    // whether the amount is changed from what we got from cost tables
    amountIsForced?: boolean,
    percentage?: number,
    // has the stripe charge once paid
    charge?: any,
  } = {};
}

export class TableBlock extends Block {
  public type = "table";
  public data: {
    rows: Array<Array<string>>,
    headers: Array<string>,
  } = {
    rows: [["", ""], ["", ""]],
    headers: ["", ""],
  };

  addRow() {
    const numberCol = this.data.rows[0].length;
    // Array.fill is not on IE
    this.data.rows.push(Array(numberCol).join(".").split("."));
  }

  removeRow(index: number) {
    this.data.rows.splice(index, 1);
  }

  addColumn() {
    this.data.rows = this.data.rows.map(row => {
      const r = row.slice();
      r.push("");
      return r;
    });
    this.data.headers.push("");
  }

  removeColumn(index: number) {
    this.data.rows = this.data.rows.map(row => {
      const r = row.slice();
      r.splice(index, 1);
      return r;
    });

    this.data.headers.splice(index, 1);
  }

  updateContent(val: string, rowIndex: number, colIndex: number) {
    const row = this.data.rows[rowIndex];
    if (row) {
      row[colIndex] = val;
    }
  }

  moveRow(index: number, direction: MoveDirection) {
    const swapIndex = index + (direction === MoveDirection.Up ? -1 : 1);
    const toSwap = this.data.rows[swapIndex];
    this.data.rows[swapIndex] = this.data.rows[index];
    this.data.rows[index] = toSwap;
  }

  moveColumn(index: number, direction: MoveDirection) {
    const swapIndex = index + (direction === MoveDirection.Left ? -1 : 1);
    this.data.rows = this.data.rows.map(row => {
      const toSwap = row[swapIndex];
      row[swapIndex] = row[index];
      row[index] = toSwap;
      return row;
    });
    const toSwap = this.data.headers[swapIndex];
    this.data.headers[swapIndex] = this.data.headers[index];
    this.data.headers[index] = toSwap;
  }

  updateHeader(index: number, val: string) {
    this.data.headers[index] = val;
  }

  hasHeaders(): boolean {
    return this.data.headers.some(h => h !== "");
  }
}
