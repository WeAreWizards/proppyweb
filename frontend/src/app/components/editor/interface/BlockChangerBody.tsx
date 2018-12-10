import * as React from "react";
import * as ReactDOM from "react-dom";
import { observable } from "mobx";
import { observer } from "mobx-react";
import * as classnames from "classnames";


import FileUploader from "../../core/FileUploader";
import SectionImporterDialog from "./SectionImporter";
import { BLOCK_TYPES } from "../../../constants/blocks";
import { KEY_CODES } from "../../../constants/events";
import { getOffsetTop } from "../../../utils/html";

import rootStore from "../../../stores/RootStore";


interface IBlockChangerBodyProps {
  proposalId: number;
  uid: string;
  filter: string;
}

// where is the block displayed compared to the editable paragraph
enum Position {
  Above,
  Below,
}


@observer
export class BlockChangerBody extends React.Component<IBlockChangerBodyProps, {}> {
  @observable position: Position = Position.Below;
  @observable selected: number = 0;
  @observable imageDialogOpen: boolean = false;
  @observable embedDialogOpen: boolean = false;
  @observable importDialogOpen: boolean = false;

  CHOICES = [
    {
      label: "Heading 1",
      icon: "icon-h1",
      keywords: ["title", "h1", "heading"].join(" "),
      action: this.replaceBlock.bind(this, BLOCK_TYPES.Section),
    },
    {
      label: "Heading 2",
      icon: "icon-h2",
      keywords: ["subtitle", "h2", "heading"].join(" "),
      action: this.replaceBlock.bind(this, BLOCK_TYPES.Subtitle),
    },
    {
      label: "Heading 3",
      icon: "icon-h3",
      keywords: ["h3", "heading"].join(" "),
      action: this.replaceBlock.bind(this, BLOCK_TYPES.H3),
    },
    {
      label: "Unordered list",
      icon: "icon-ul",
      keywords: ["unordered", "list", "ul", "bullet"].join(" "),
      action: this.replaceBlock.bind(this, BLOCK_TYPES.UnorderedItem),
    },
    {
      label: "Ordered list",
      icon: "icon-ol",
      keywords: ["ordered", "list", "ol", "numbered"].join(" "),
      action: this.replaceBlock.bind(this, BLOCK_TYPES.OrderedItem),
    },
    {
      label: "Image",
      icon: "icon-image",
      keywords: ["image", "img", "pic", "picture"].join(" "),
      action: () => this.imageDialogOpen = true,
    },
    {
      label: "Divider",
      icon: "icon-hr",
      keywords: ["divider", "separator", "hr"].join(" "),
      action: this.replaceBlock.bind(this, BLOCK_TYPES.Divider),
    },
    {
      label: "Cost table",
      icon: "icon-cost-table",
      keywords: ["table", "cost"].join(" "),
      action: this.replaceWithCostTable.bind(this),
    },
    {
      label: "Signature",
      icon: "icon-sign",
      keywords: ["signature", "e-sign", "esign"].join(" "),
      action: this.replaceBlock.bind(this, BLOCK_TYPES.Signature),
      disabled: rootStore.blockStore.hasSignature,
    },
    {
      label: "Quote",
      icon: "icon-quotes-right",
      keywords: ["quote", "citation"].join(" "),
      action: this.replaceBlock.bind(this, BLOCK_TYPES.Quote),
    },
    {
      label: "Payment",
      icon: "icon-payment",
      keywords: ["payment", "stripe"].join(" "),
      action: this.replaceBlock.bind(this, BLOCK_TYPES.Payment),
      disabled: rootStore.blockStore.hasPayment,
    },
    {
      label: "Embed content",
      icon: "icon-embed",
      keywords: ["embed", "video", "iframe"].join(" "),
      action: this.replaceBlock.bind(this, BLOCK_TYPES.Embed),
    },
    {
      label: "Import section",
      icon: "icon-import",
      keywords: ["import", "section"].join(" "),
      action: () => this.importDialogOpen = true,
    },
    {
      label: "Table",
      icon: "icon-table",
      keywords: ["table", "tabulated"].join(" "),
      action: this.replaceBlock.bind(this, BLOCK_TYPES.Table),
    },
  ];

  constructor(props) {
    super(props);
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  componentDidMount() {
    document.addEventListener("keydown", this.onKeyDown, false);
    this.positionSelf(true);
  }

  componentDidUpdate() {
    this.positionSelf();
  }

  positionSelf(setPosition = false) {
    const paragraph = document.getElementById(this.props.uid);
    const node = ReactDOM.findDOMNode(this) as HTMLElement;
    if (!node || !paragraph) {
      return;
    }
    const boundary = paragraph.getBoundingClientRect();

    // We need to see whether we have space to display it above or below, with
    // a preference on below
    const selfHeight = node.clientHeight;

    // height + clientY > (screen height - padding)
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;

    let position = this.position;
    if (setPosition) {
      if (boundary.bottom + selfHeight < viewportHeight) {
        position = Position.Below;
      } else if (boundary.top - selfHeight > 0) {
        position = Position.Above;
      }
      this.position = position;
    }

    if (position === Position.Below) {
      node.style.top = `${getOffsetTop(paragraph) - 20}px`;
    } else {
      // the max height of the block changer, including all the padding
      const maxHeight = 332;
      // the height of the block changer can change so we need to ensure it's always
      // at the same top position, so we have to compensate for it
      const factor = selfHeight > 300 ? 0 : (maxHeight - selfHeight);
      node.style.top = `${getOffsetTop(paragraph) - maxHeight + factor - 75}px`;
    }

    node.style.left = `${boundary.left + 5}px`;
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.onKeyDown as any, false);
  }

  replaceBlock(type: string) {
    rootStore.editorStore.hideBlockChanger();
    rootStore.blockStore.turnInto(this.props.uid, {type}, true);
  }

  imageUploaded(result: any) {
    rootStore.editorStore.hideBlockChanger();
    rootStore.blockStore.turnInto(this.props.uid, {type: BLOCK_TYPES.Image, url: result.url});
  }

  replaceWithCostTable() {
    rootStore.editorStore.hideBlockChanger();
    rootStore.blockStore.turnInto(this.props.uid, {type: BLOCK_TYPES.CostTable, currency: rootStore.companyStore.us.currency});
  }

  renderImportDialog() {
    if (!this.importDialogOpen) {
      return null;
    }

    const {proposalId, uid} = this.props;

    return (
      <SectionImporterDialog
        proposalId={proposalId}
        onClose={() => this.importDialogOpen = false}
        insertAtUid={uid} />
    );
  }

  // Takes current input and filter the choice based on it
  filteredChoices(): Array<any> {
    // need to remove the /
    const filter = this.props.filter
      .trim()
      .substring(1, this.props.filter.length)
      .toLowerCase();


    if (filter === "") {
      return this.CHOICES;
    }

    return this.CHOICES.filter(choice => {
      return choice.keywords.indexOf(filter) > - 1;
    });
  }

  onKeyPress(event: React.KeyboardEvent<any>) {
    if (event.which === KEY_CODES.Enter) {
      this.doAction(null, event);
    }
  }

  // scroll the container if needed (current selected option not in not in viewport)
  scrollChoicesContainer(index: number) {
    const choicesNode = document.querySelectorAll(".block-changer__choices li");
    const choicesContainer = this.refs["choices-container"] as HTMLDivElement;

    const node = choicesNode[index] as HTMLElement;
    // A node is 41px tall
    if (node && node.offsetTop > choicesContainer.offsetHeight) {
      choicesContainer.scrollTop += 41;
    }

    if (node && node.offsetTop < choicesContainer.scrollTop) {
      choicesContainer.scrollTop -= 41;
    }

    // Make sure we're all scrolled down for the last node
    if (!node && index === choicesNode.length) {
      choicesContainer.scrollTop = choicesContainer.offsetHeight;
    }
  }

  onKeyDown(event: React.KeyboardEvent<any> | KeyboardEvent) {
    const choices = this.filteredChoices();

    if (event.which === KEY_CODES.Down) {
      if (this.selected < choices.length - 1) {
        this.selected += 1;
        this.scrollChoicesContainer(this.selected + 1);
        event.preventDefault();
      }
    } else if (event.which === KEY_CODES.Up) {
      if (this.selected > 0) {
        this.selected -= 1;
        // Not -1 the selected here is not a bug, it results in a smoother
        // scrolling
        this.scrollChoicesContainer(this.selected);
        event.preventDefault();
      }
    } else if (event.which === KEY_CODES.Enter) {
      this.doAction(null, event);
    }
  }

  // preventDefault so the contenteditable paragraph doesn't lose focus
  doAction(choice?, event?: any) {
    const choices = this.filteredChoices();
    if (!choice) {
      choice = choices[this.selected];
      if (!choice) {
        return;
      }
    }

    // We don't want new lines in new content so preventDefault on anything
    // that doesn't require a popup beforehand
    if (["Import section", "Image", "Embed content"].indexOf(choice.label) === -1) {
      event.preventDefault();
    }

    if (!choice.disabled) {
      choice.action();
    }
    // Don't forget to preventDefault for the rest
    event.preventDefault();

    if (["Import section", "Image", "Embed content"].indexOf(choice.label) === -1) {
      rootStore.editorStore.hideBlockChanger();
    }
  }

  renderBlockOption(choice: any, index: number) {
    const classes = classnames("block-changer__choice", {
      "block-changer__choice--disabled": choice.disabled,
      "block-changer__choice--selected": index === this.selected,
    });
    return (
      <li
        onMouseEnter={() => this.selected = index}
        key={choice.label}
        className={classes}
        onClick={this.doAction.bind(this, choice)}>
        <span className={choice.icon} />
        <span>{choice.label}</span>
      </li>
    );
  }

  render() {
    // Do not render the inline one if there is no results
    if (this.filteredChoices().length === 0) {
      return null;
    }
    const position = this.position;

    return (
      <div className="block-changer__menu block-changer__menu--inline" id="block-changer-unique">
        <FileUploader
           openFileDialog={this.imageDialogOpen}
           purpose="proposal-image"
           onCancel={() => this.imageDialogOpen = false}
           onUpload={this.imageUploaded.bind(this)} />
        {this.renderImportDialog()}

        {position === Position.Below ? <small className="block-changer__hint">Type to filter</small> : null}

        <ul className="block-changer__choices" ref="choices-container">
          {this.filteredChoices().map((choice, i) => {
            return this.renderBlockOption(choice, i);
          })}
        </ul>

        {position === Position.Above ? <small className="block-changer__hint">Type to filter</small> : null}
      </div>
    );
  }
}

export default BlockChangerBody;
