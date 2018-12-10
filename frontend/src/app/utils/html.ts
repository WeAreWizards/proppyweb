// Cross platform way to check if a text node (p, li) is empty
// Firefox adds <br> to empty contenteditable, making it
// impossible by default to render the :empty css property
// we use for placeholders in contenteditable
export function isTextNodeEmpty(node: any) {
  const value = node.innerHTML.trim();
  return removeBr(value) === "";
}


export function removeBr(html: string | undefined) {
  if (html === undefined) {
    return;
  }
  return html
    .replace("<br>", "")
    .replace("<br/>", "")
    .replace(`<br type="_moz"></br>`, "") // firefox snowflake
    .replace("</br>", "");
}


export function htmlTextLength(htmlString: string): number {
  // Return just the text length as counted without any HTML elements.
  const el = document.createElement("p");
  el.innerHTML = htmlString;
  return el.textContent.length;
}


// Turns out Firefox doesn't have relatedTarget, there's this issue on
// react https://github.com/facebook/react/issues/2011 which contains a link
// to a firefox issue to add it
// This code is roughly taken from that issue as well and should work on all
// major browsers
// Also from https://github.com/Automattic/wp-calypso/pull/2054
// If we pass no events, just call the callback directly with null as args
export function getRelatedTarget(event: any, callback: (target: any) => void): void {
  if (event === undefined) {
    callback(null);
    return;
  }
  const nativeEvent = event.nativeEvent || {};

  setTimeout(() => {
    const target = event.relatedTarget
      || nativeEvent.explicitOriginalTarget  // FF
      || document.activeElement; // IE 11
    callback(target);
  }, 0);
}


export function isDescendantOf(child: Node, condition: (node: Node) => boolean): boolean {
  if (!child) {
    return false;
  }

  let node = child.parentNode as any;
  while (node !== null) {
    if (condition(node)) {
      return true;
    }
    node = node.parentNode;
  }

  return false;
}

// Finds whether the given child is a descendant of an element with the given
// class name
export function isDescendantOfClass(child: HTMLElement, className: string) {
  if (child.classList.contains(className)) {
    return;
  }

  return isDescendantOf(
    child,
    (node: HTMLElement) => {
      return node.className && node.className.indexOf(className) > -1;
    },
  );
}

// Finds whether the given child is a descendant of an element with the given tag
// Takes an array of tag to account for strong/b and em/i
export function isDescendantOfTag(child: Node, tagNames: Array<string>) {
  return isDescendantOf(
    child,
    (node: HTMLElement) => {
      return tagNames.indexOf(node.nodeName.toLowerCase()) > -1;
    },
  );
}


// Used to get the parent node that is a link tag
export function getParentLinkTag(child: Node): HTMLLinkElement {
  let node = child.parentNode as any;
  while (node !== null) {
    if (node.nodeName.toLowerCase() === "a") {
      return node;
    }
    node = node.parentNode;
  }
}


export function unescape(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&copy;/g, "©")
    .replace(/&pound;/g, "&")
    .replace("<br>", ""); // firefox adds <br> everywhere
}

// Let the browser do it instead of regex
export function stripTags(value: string): string {
  const div = document.createElement("div");
  div.innerHTML = value;
  return div.innerText;
}

// from jquery offset method
export function getOffsetTop(elem: any): number {
  const rect = elem.getBoundingClientRect();
  return rect.top  + window.pageYOffset - elem.ownerDocument.documentElement.clientTop;
}


// Cross-platform way to get scrollTop
// firefox doesn't have document.body.scrollTop
export function getScrollTop(): number {
    return document.documentElement.scrollTop || document.body.scrollTop;
}
