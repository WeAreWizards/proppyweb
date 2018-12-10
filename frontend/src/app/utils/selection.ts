// TODO: fix the terrible file name
import { SearchDirection } from "../interfaces";

export function getBlockContainer(node: Node): Node {
  let currentNode = node;
  while (currentNode) {
    // nodeType === 1 means an element (p, div)
    // https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
    // TODO: check for contenteditable?
    if (currentNode.nodeType === 1 && /^(P|H[1-6]|DIV|LI)$/i.test(currentNode.nodeName)) {
      return currentNode;
    }
    currentNode = currentNode.parentNode;
  }
}


// From http://stackoverflow.com/questions/5740640/contenteditable-extract-text-from-caret-to-end-of-element
// Modified a bit in order to get the HTML rather than a document-fragment
export function extractContentAfterCaret(): string {
  // tests don't have access to window.getSelection
  if (!window.getSelection) {
    return "";
  }
  const selection = window.getSelection();
  if (selection.rangeCount === 0) {
    return "";
  }

  const range = selection.getRangeAt(0);
  const blockElement = getBlockContainer(range.endContainer);

  if (blockElement) {
    const newRange = range.cloneRange();
    newRange.selectNodeContents(blockElement);
    newRange.setStart(range.endContainer, range.endOffset);
    const fragment = newRange.extractContents();
    // This is so silly-looking but I can't find a way to get the
    // HTML content of a document fragment
    const div = document.createElement("div");
    div.appendChild(fragment.cloneNode(true));

    // The above has the defect of potentially adding empty tags such as <b></b>
    // if we are pressing enter at the end of a bold string.
    // The regex removes those empty tags
    return div.innerHTML.replace(/<[^\/>][^>]*><\/[^>]+>/gim, "");
  }

  return "";
}


export function getSelectionRange(): Range {
  const selection = document.getSelection();
  if (selection.rangeCount === 0) {
    return null;
  }

  return selection.getRangeAt(0).cloneRange();
}


export function setSelectionRange(range: Range) {
  const selection = document.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}


export function getSelectionContainer(range: Range): Node {
  let parentNode = range.commonAncestorContainer;

  while (parentNode !== null) {
    if ((<any> parentNode).contentEditable === "true") {
      return parentNode;
    }
    // whoa
    parentNode = parentNode.parentNode;
  }
  return null;
}

export function isCaretAtBeginning(): boolean {
  // If the caret is at the beginning of a paragraph and the user
  // presses backspace want to collapse the current paragraph with the
  // previous one.
  const s = window.getSelection();
  if (s.rangeCount === 0) {
    throw new Error("unexpected null range in isCaretAtBeginning");
  }
  const range = s.getRangeAt(0);
  let parentNode = s.anchorNode.parentNode;
  let notParagraph = false;
  // If we are at the beginning of a i/b/a, the anchor node will NOT be the
  // paragraph
  if (parentNode.nodeName !== "P") {
    // possible to have a non-p node inside a non-p node but seems unlikely
    parentNode = parentNode.parentNode;
    notParagraph = true;
  }
  let firstChild = parentNode.firstChild === s.anchorNode;

  // If we have a paragraph that only contains a i/b/a, anchorNode will point
  // to the content of the node and not the node itself so we need to compare
  // one more level down
  if (notParagraph && parentNode.childNodes.length === 1) {
    firstChild = parentNode.firstChild.firstChild === s.anchorNode;
  }
  return range.collapsed && range.startOffset === 0 && range.endOffset === 0 && firstChild;
}

export function getRangeForPosition(node: HTMLElement, pos: number): Range {
  // Content editable can contain child elements so we need to iterate
  // over them to find the correct anchor node.
  // Returns range.
  const range = document.createRange();
  for (let i = 0; i < node.childNodes.length; i++) {
    const cn = node.childNodes[i];
    const len = cn.textContent.length;
    if (pos <= len) {

      // Quote from MDN
      // (https://developer.mozilla.org/en-US/docs/Web/API/Range/setStart):
      // "If the startNode is a Node of type Text, Comment, or
      // CDATASection, then startOffset is the number of characters
      // from the start of startNode. For other Node types,
      // startOffset is the number of child nodes between the start of
      // the startNode."
      //
      // I.e. we need to recurse into child nodes with text because
      // the index doesn't mean characters for HTMLElement nodes.
      if (cn.childNodes.length > 0) {
        return getRangeForPosition(cn as HTMLElement, pos);
      }
      range.setStart(cn, pos);
      range.collapse(true);
      return range;
    }
    pos -= len;
  }

  // collapse(false) sets the cursor to the end (using true will fail
  // and defocus because pos is pointing to after the last char)
  range.setEnd(node.childNodes[node.childNodes.length - 1], pos);
  range.collapse(false);

  return range;
}

export function setCaret(node: HTMLElement, pos: number) {
  const range = getRangeForPosition(node, pos);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

export function setCaretAtEnd(node: HTMLElement) {
  node.focus();
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}


export function getLineIndexPos(): null | [number, number, number] {
  // Returns the index (0-based) of where the cursor is in the
  // lines, and the total number of lines. So e.g. for one line we'd
  // return (0, 1). For the last line in 10 lines (9, 10).
  const s = window.getSelection();
  const range = s.getRangeAt(0);
  const ce: any = getSelectionContainer(range);
  if (!ce) {
    return null;
  }

  // TODO cursorRect is sometimes undefined in firefox, not sure how to reproduce.
  // If the cursor is at the beginning of a line then there are two
  // client rects, one on previous line one on the line the cursor
  // is actually painted. We Always want to take the one that's
  // rendered (the last one).
  const cursorRect = range.getClientRects()[range.getClientRects().length - 1];
  const ceRect = ce.getClientRects()[0];
  if (!cursorRect && ceRect) {
    return [0, 1, ceRect.left];
  }

  // NB we're calculating the vertical cursor center to work around
  // inaccuracies in browser's pixel positions.
  const ix = Math.floor(Math.round((cursorRect.bottom + cursorRect.top) / 2 - ceRect.top) / cursorRect.height);
  const lines = Math.round(Math.round(ceRect.height) / cursorRect.height);
  return [ix, lines, cursorRect.left];
}


export function findHorizontalPixelPos(node: HTMLElement, start: number, x: number, direction: SearchDirection) {
  // Assumes the new block has been focused and we now need to set the
  // cursor to some new horizontal position. The direction can be
  // forward or backwards.

  // This function has the (unfortunately unavoidable) side effect of
  // moving the caret.

  let pos = start;
  const sel = window.getSelection();

  if (direction === SearchDirection.BACKWARD) {
    while (pos > 0) {
      const range = getRangeForPosition(node, pos);
      sel.removeAllRanges();
      sel.addRange(range);
      const endCr = range.getClientRects()[range.getClientRects().length - 1];
      if (endCr.left <= x) { return pos; }
      pos -= 1;
    }
  } else {
    while (true) {
      try { // TODO should probably use error codes instead of try / catch
        const range = getRangeForPosition(node, pos);
        sel.removeAllRanges();
        sel.addRange(range);
        const startCr = range.getClientRects()[0];
        if (startCr.left >= x) { return pos; }
        pos += 1;
      } catch (err) {

        return pos - 1;
      }
    }
  }
  return pos;
}
