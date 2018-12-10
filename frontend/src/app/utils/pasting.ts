import * as HTMLJanitor from "html-janitor";

import { extractContentAfterCaret } from "./selection";
import { BLOCK_TYPES } from "../constants/blocks";


// Most of those taken from https://github.com/yabwe/medium-editor/blob/master/src/js/extensions/paste.js
const pasteReplacements = [
  // h4 replacement with bold paragraph as proppy doesn't have h
  [/<h4.*?>/gi, "<p><b>"],
  [/<\/h4>/gi, "</b></p>"],

  // replace two bogus tags that begin pastes from google docs
  // First one might not only be but can't remove everything because it could be a ul
  [/<b[^>]*docs-internal-guid[^>]*>/gi, ""],
  [/<\/b>(<br[^>]*>)?$/gi, ""],

  // un-html spaces and newlines inserted by OS X
  [/<span class="Apple-converted-space">\s+<\/span>/g, " "],
  [/<br class="Apple-interchange-newline">/g, "<br>"],

  // replace google docs italics+bold with a span to be replaced once the html is inserted
  [/<span[^>]*(font-style:italic;font-weight:700|font-weight:700;font-style:italic)[^>]*>/gi, "<span class='replace-with italic bold'>"],
  // replace google docs italics with a span to be replaced once the html is inserted
  [/<span[^>]*font-style:italic[^>]*>/gi, "<span class='replace-with italic'>"],
  // replace google docs bolds with a span to be replaced once the html is inserted
  [/<span[^>]*font-weight:700[^>]*>/gi, "<span class='replace-with bold'>"],

  // cleanup comments added by Chrome when pasting html
  ["<!--EndFragment-->", ""],
  ["<!--StartFragment-->", ""],

  // Microsoft Word makes these odd tags, like <o:p></o:p>
  [/<\/?o:[a-z]*>/gi, ""],

  // Newlines between paragraphs in html have no syntactic value,
  // but then have a tendency to accidentally become additional paragraphs down the line
  [/<\/p>\n+/gi, "</p>"],
  [/\n+<p/gi, "<p"],
];


// From https://github.com/yabwe/medium-editor/blob/master/src/js/extensions/paste.js
export function cleanPaste(html: string) {
  // We have a set of things we allow
  const janitor = new HTMLJanitor({
    tags: {
      h1: {},
      h2: {},
      h3: {},
      br: {},
      p: {},
      em: {},
      i: {},
      b: {},
      strong: {},
      ul: {},
      ol: {},
      li: {},
      span: (el) => {
        // Keep the google docs spans so we can replace them right after
        return el.classList.contains("replace-with") || el.classList.contains("replace-with");
      },
      a: { href: true},
    },
  });

  let cleaned = html;
  pasteReplacements.map((replacement) => {
    cleaned = cleaned.replace(<any> replacement[0], <string> replacement[1]);
  });

  // html-janitor should give us good stuff to work with
  // ie no nested block tags like a ul in a p
  cleaned = janitor.clean(cleaned);
  // But that might give us some empty tags so let's remove them
  cleaned = cleaned.replace(/<[^\/>][^>]*><\/[^>]+>/gim, "");

  // Now let's replace any potential google docs tags to i/b or both
  cleaned = cleaned.replace(/<span class=['"]replace-with italic bold['"]>(.*?)<\/span>/gi, "<i><b>$1</b></i>");
  cleaned = cleaned.replace(/<span class=['"]replace-with italic['"]>(.*?)<\/span>/gi, "<i>$1</i>");
  cleaned = cleaned.replace(/<span class=['"]replace-with bold['"]>(.*?)<\/span>/gi, "<b>$1</b>");

  // And some word specific adjustments
  // That's very hackish but we rely on the fact that proppy will guess when a ul/ol
  // starts and finishes so we just wrap all of them into their own ul/ol and let proppy
  // handle it down the road
  // TODO: I believe word has lots of differents types of bullet points, we'll need to add
  // them to the regex below
  cleaned = cleaned.replace(/<p>·[&nbsp;]+(.*?)<\/p>/gi, "<ul><li>$1</li></ul>");
  cleaned = cleaned.replace(/<p>\d+\.[&nbsp;]+(.*?)<\/p>/gi, "<ol><li>$1</li></ol>");
  cleaned = cleaned.replace(/<ul><ul>/gi, "<ul>");
  // avoid leading <br>
  cleaned = cleaned.replace(/^<br>/gi, "");
  // a <br>- is likely to be a bullet point (from gmail)
  cleaned = cleaned.replace(/<br>-(.*?)(?=<br>)/gi, "<ul><li>$1</li></ul>");
  // if there is one potential li at the end
  cleaned = cleaned.replace(/<br>-(.*)/gi, "<ul><li>$1</li></ul>");
  cleaned = cleaned.replace(/<\/ul><\/ul>/gi, "</ul>");
  // remove any leftover <br> since they feel invisible in proppy
  cleaned = cleaned.replace("<br>", "");
  // If we have text without tags and html tags after, wrap it in a <p>
  cleaned = cleaned.replace(/^(?!<[^\/>][^>]*>)(.*?)(?=<p>|<ul>|<ol>|<h3>)/gi, "<p>$1</p>");
  return cleaned;
}


// Takes html cleaned by html.cleanPaste and returns an array of blocks for us to use
// in proppy
export function blockify(cleanedHTML: string): Array<any> {
  const splitter = document.createElement("div");
  splitter.innerHTML = cleanedHTML;
  // children is a HTMLCollection, not an array
  const parts = splitter.children;
  const blocks = [];

  for (let i = 0; i < parts.length; i++) {
    const child = <HTMLElement> parts[i];
    const tagName = child.tagName.toLowerCase();

    switch (tagName) {
      case "p":
        blocks.push({type: BLOCK_TYPES.Paragraph, data: {value: child.innerHTML.trim()}});
        break;
      case "h1":
      case "h2":
      case "h3":
        const value = (<any> child).innerText || child.textContent ;
        let kind = BLOCK_TYPES.Subtitle;
        if (tagName === "h1") {
          kind = BLOCK_TYPES.Section;
        } else if (tagName === "h2") {
          kind = BLOCK_TYPES.Subtitle;
        } else {
          kind = BLOCK_TYPES.H3;
        }
        blocks.push({type: kind, data: {value: value.trim() }});
        break;
      case "ul":
      case "ol":
        // Should only be li
        const lis = (<any> child).children;
        for (let j = 0; j < lis.length; j++) {
          const li = <HTMLElement> lis[j];
          blocks.push({
            type: tagName === "ul" ? BLOCK_TYPES.UnorderedItem : BLOCK_TYPES.OrderedItem,
            data: {value: li.innerHTML.trim()},
          });
        }
        break;
      case "br":
      case "b":
      case "i":
        continue;
      default:
        console.log("Unknown tag in blockify:" + tagName); // tslint:disable-line
        console.log("Cleaned html was: " + cleanedHTML); // tslint:disable-line
        break;
    }
  }

  return blocks;
}

// Helper function extracted from ContentEditable for easy testing
// we can pass afterCaret for testing reasons
export function pasteHTML(html: string, currentTag: string, currentHTML: string, afterCaret?: string) {
  const cleanedHTML = cleanPaste(html);
  // If it's an inline paste, just append it
  if (!/<p>|<ul>|<ol>|<h3>/.test(cleanedHTML)) {
    // tests don't have document.execCommand
    if (document.execCommand) {
      document.execCommand("insertHTML", false, cleanedHTML);
    }
    return null;
  }

  // Pasting a block in the title is ignored
  if (currentTag === "h1") {
    return null;
  }

  // If it's a block, we need to append blocks in batches
  const blocks = blockify(cleanedHTML);
  const isEmpty = currentHTML === "";
  // We start optimistic and say we won't paste in the current block
  let replaceCurrent = false;

  // but we might if the current p is empty paste inside it
  if (isEmpty && currentTag === "p") {
      replaceCurrent = true;
  }

  afterCaret = afterCaret || extractContentAfterCaret();

  if (afterCaret.trim() !== "") {
    blocks.push({type: BLOCK_TYPES.Paragraph, data: {value: afterCaret}});
  }

  return {blocks, replaceCurrent};
}
