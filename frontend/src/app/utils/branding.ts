import { isEqual } from "lodash";

import { DEFAULT_BRANDING, IBranding } from "../stores/models/Company";



// Inject <link> tag for google fonts.
// If the fonts are Lato and Tisa, do nothing
export function injectGoogleFontsTag(families: Array<string>) {
  const familyString = families.map(f => {
    if (f !== "Lato" && f !== "Tisa" && f !== "ff-tisa-web-pro") {
      return f.replace(" ", "+");
    }
  }).filter(Boolean).join("|");

  if (familyString === "") {
    return;
  }

  let link = document.getElementById("google-fonts") as HTMLLinkElement;
  if (!link) {
    link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css?family=" + familyString;
    link.id = "google-fonts";
    document.head.appendChild(link);
  } else {
    link.href = "https://fonts.googleapis.com/css?family=" + familyString;
  }
}

export function removeGoogleFontsTag() {
  const link = document.getElementById("google-fonts") as HTMLLinkElement;
  if (!link) {
    return;
  }
  document.head.removeChild(link);
}


// Apply both colours and font branding to the current page
export function brandProposal(branding: IBranding) {
  // Use typekit name
  if (branding.fontBody === "Tisa") {
    branding.fontBody = "ff-tisa-web-pro";
  }

  // Do nothing if no branding
  if (isEqual(DEFAULT_BRANDING, branding)) {
    return;
  }

  // Google fonts injection first
  const { fontHeaders, fontBody, primaryColour } = branding;
  injectGoogleFontsTag([fontHeaders, fontBody]);

  // Now we need to create another css node to set fonts/colours on classes
  const style = document.createElement("style");
  style.type = "text/css";
  style.id = "branding";
  // tslint:disable-next-line
  style.innerHTML = `
    .proposal-content p, .proposal-content li, .proposal-content td {
      font-family: "${fontBody}", serif !important;
    }
    
    h1, h2, h3 {
      font-family: "${fontHeaders}", sans-serif !important;
    }
    
    .table-of-contents--highlight span, .comment-form__username, .comment__username,
    .proposal-content .icon-add-comment:hover, .proposal-content .icon-bubble-full,
    .proposal-content label, .proposal-content a, blockquote p, .speech-bubble,
     blockquote .icon-quotes-right, .proposal-content .action, .icon-print:hover {
      color: ${primaryColour} !important;
    }
    
    .comment-box {
      border-color: ${primaryColour} !important;
    }
    
    .proposal-content .button {
      background-color: ${primaryColour} !important;
    }
  `;

  document.head.appendChild(style);
}

export function cleanupBranding() {
  removeGoogleFontsTag();
  const cssNode = document.getElementById("branding");
  if (!cssNode) {
    return;
  }
  document.head.removeChild(cssNode);
}
