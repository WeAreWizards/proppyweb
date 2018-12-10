
export const HOMEPAGE_TOUR = [
  {
    title: "Hey there",
    text: "Thanks for signing up to Proppy! <br> Let's do a quick tour of the dashboard to help you get started.",
    selector: "#dashboard-tour-start",
    position: "top" as any,
  },
  {
    title: "Create a proposal",
    text: "The most important part first: this is the button to create a new, empty proposal.",
    selector: "[data-tour='plus']",
    position: "right" as any,
  },
  {
    title: "Sidebar",
    text: `
      Proposals are divided by their current status for easy organisation. <br>
      Note that deleting a proposal will move them to the Trash where it can be deleted permanently or restored.
    `,
    selector: "[data-tour='dashboard-sidebar']",
    position: "right" as any,
  },
  {
    title: "Search",
    text: `Search by title, tags, client or status to find what you want quickly.`,
    selector: "[data-tour='dashboard-search']",
    position: "right" as any,
  },
  {
    title: "A proposal",
    text: `
      This is one of your proposals. Click on the title to open it in the editor.
      After publishing, you'll also see a link to the published version.
      <br>
      <b>Tip:</b> you can click on tags or on the client to quickly pull up all related proposals.
    `,
    selector: "[data-tour='proposal-item']",
    position: "bottom" as any,
  },
  {
    title: "Proposal actions",
    text: `
       Click on <strong>Duplicate</strong> to speed up writing your next proposal by basing it on an existing one. <br>
       Don't forget to change your proposals status manually when a decision is made outside of Proppy so that you can get an
       up-to-date dashboard.
    `,
    selector: "[data-tour='proposal-actions']",
    position: "bottom" as any,
  },
  {
    title: "Settings",
    text: `
       Hover your mouse to see all the settings. <br>
       That's where you can <b>invite your teammates</b> and <b>change your company details</b> like currency and logo, amongst others.
    `,
    selector: "[data-tour='settings']",
    position: "left" as any,
  },
  {
    title: "Done!",
    text: `
       Ok I lied, I said "Done!" but there is actually one more thing to discover: the editor.<br>
       Click on the title <b>Start here!</b> to get started after the tour.
    `,
    selector: "[data-tour='proposal-title']",
    position: "bottom" as any,
  },
];
