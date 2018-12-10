export const BLOCK_TYPES = {
  Section: "section",
  Paragraph: "paragraph",
  Subtitle: "subtitle",
  UnorderedItem: "uli",
  OrderedItem: "oli",
  Image: "image",
  CostTable: "cost_table",
  Signature: "signature",
  Quote: "quote",
  Embed: "embed",
  Divider: "divider",
  H3: "h3",
  Payment: "payment",
  Table: "table",
};

export const TEXT_BLOCK_TAGS = {
  section: "h2",
  paragraph: "p",
  subtitle: "h3",
  h3: "h4", // TODO: better names and tags for h1, h2, subsection etc
  uli: "li",
  oli: "li",
};
