import { BLOCK_TYPES } from "../constants/blocks";


export function isListBlock(blockType: string): boolean {
  return [
    BLOCK_TYPES.UnorderedItem,
    BLOCK_TYPES.OrderedItem,
  ].indexOf(blockType) > -1;
}

export function isTextBlock(blockType: string): boolean {
  return [
    BLOCK_TYPES.Section,
    BLOCK_TYPES.Subtitle,
    BLOCK_TYPES.H3,
    BLOCK_TYPES.Paragraph,
    BLOCK_TYPES.UnorderedItem,
    BLOCK_TYPES.OrderedItem,
  ].indexOf(blockType) > -1;
}

export function needsFillerBlock(blockType: string): boolean {
  return [
    BLOCK_TYPES.Signature,
    BLOCK_TYPES.CostTable,
    BLOCK_TYPES.Divider,
    BLOCK_TYPES.Table,
    BLOCK_TYPES.Payment,
  ].indexOf(blockType) > -1;
}

export function isHeaderBlock(blockType: string): boolean {
  return [
    BLOCK_TYPES.Section,
    BLOCK_TYPES.Subtitle,
    BLOCK_TYPES.H3,
  ].indexOf(blockType) > -1;
}

export function headerLevel(h): number {
  switch (h) {
    case BLOCK_TYPES.Section: return 0;
    case BLOCK_TYPES.Subtitle: return 1;
    case BLOCK_TYPES.H3: return 2;
    default: return 3;
  }
}
