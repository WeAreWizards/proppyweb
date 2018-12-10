import * as React from "react";

import Block from "../components/proposals/Block";
import { isListBlock, isHeaderBlock, headerLevel } from "./blocks";
import { BLOCK_TYPES } from "../constants/blocks";
import { RenderContext } from "../interfaces";
import { Block as BlockClass } from "../stores/models/Block";


// The renderer is a parser in disguise, operating on the stream of
// blocks. Implementing a simple recursive descent parser here to make
// it a bit more manageable.
type Context = {
  ix: number;
  renderContext: RenderContext;
  shareUid: string;
  dndActiveUid?: string;
}; // needs to be a dict so ix can be mutated


function renderSection(uid: string, value: string, children: any): any {
  const slug = value.toLowerCase().replace(/ /g, "_");

  return (
    <div key={`container-${uid}`} id={`container-${uid}`}>
      <a id={`#${slug}`} />
        <div className="block-container-highlight">
          {children}
        </div>
    </div>
  );
}

function renderBlock(block: BlockClass, context: Context, beingDragged: boolean) {
  // We clone the block to avoid modifying by reference in the store
  // TODO: not very efficient, find a better place
  return (
      <Block
        shareUid={context.shareUid}
        beingDragged={beingDragged}
        key={block.uid}
        context={context.renderContext}
        block={block.clone()} />
    );
}

function parse(
  blocks: Array<BlockClass>, context: Context, currentHeadingLevel: number = -1,  beingDragged = false,
): Array<React.ReactElement<any> > {
  if (context.ix >= blocks.length) {
    return [];
  }
  const b = blocks[context.ix];
  if (headerLevel(b.type) <= currentHeadingLevel) { return []; }
  beingDragged = b.uid === context.dndActiveUid || beingDragged;

  if (isHeaderBlock(b.type)) {
    context.ix += 1;
    const children = [renderBlock(b, context, beingDragged)].concat(parse(blocks, context, headerLevel(b.type), beingDragged));
    return [renderSection(b.uid, b.data.value, children)].concat(parse(blocks, context, currentHeadingLevel));

  } else if (isListBlock(b.type)) {
    const Tag: any = b.type === BLOCK_TYPES.UnorderedItem ? "ul" : "ol";
    const children = parseList(blocks, context, b.type, beingDragged);
    return [<Tag key={context.ix}>{children}</Tag>].concat(parse(blocks, context, currentHeadingLevel, beingDragged));

  } else {
    context.ix += 1;
    // special casing of action elements (signatures, cost tables, ...)
    if (b.uid === context.dndActiveUid) {
      return [renderBlock(b, context, true)].concat(parse(blocks, context, currentHeadingLevel, false));
    } else {
      return [renderBlock(b, context, beingDragged)].concat(parse(blocks, context, currentHeadingLevel, beingDragged));
    }
  }
}

function parseList(blocks: Array<BlockClass>, context: Context, listType: string, beingDragged: boolean): Array<any> {
  if (context.ix >= blocks.length) {
    return [];
  }
  const b = blocks[context.ix];
  if (!isListBlock(b.type) || b.type !== listType) { return []; }
  context.ix += 1;
  return [renderBlock(b, context, beingDragged)].concat(parseList(blocks, context, listType, beingDragged));
}

// Renders blocks both for the editor and the preview/shared
// One place to rule them all
export function renderBlocks(
  shareUid: string, blocks: Array<BlockClass>, context: RenderContext, dndActiveUid?: string,
): Array<any> {
  return parse(blocks.slice(), {
    ix: 0,
    renderContext: context,
    shareUid,
    dndActiveUid,
  });
}
