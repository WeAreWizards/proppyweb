import * as React from "react";
import * as classnames from "classnames";
import { debounce } from "lodash";
import * as zenscroll from "zenscroll";

import { BLOCK_TYPES } from "../../constants/blocks";
import { isHeaderBlock } from "../../utils/blocks";
import { unescape, getOffsetTop, stripTags, getScrollTop } from "../../utils/html";
import { RenderContext } from "../../interfaces";
import { Block } from "../../stores/models/Block";


interface ITableOfContentsProps {
  blocks: Array<Block>;
  context: RenderContext;
}

interface ITableOfContentsState {
  active: string;
  scrollTop: number;
  coverImageHeight: number;
}


export class TableOfContents extends React.Component<ITableOfContentsProps, ITableOfContentsState> {
  timer: any;
  debouncedScroll: any;
  lastScrollPos: number;
  positionStyle: any;
  sections: Array<Block>;

  constructor(props) {
    super(props);
    this.sections = this.findSections(props.blocks);
    this.state = {
      active: null,
      scrollTop: 0,
      coverImageHeight: null,
    };
    this.timer = null;
    this.lastScrollPos = 0;
    this.positionStyle = null;

    this.debouncedScroll = debounce(() => {
      this.setState({
        active: this.findActive(),
        scrollTop: getScrollTop(),
      } as any);
    }, 10);
  }

  findSections(blocks: Array<Block>) {
    return blocks.filter(x => isHeaderBlock(x.type));
  }

  findActive() {
    const fromTop = getScrollTop();
    const currentlyActive = [];
    this.sections.map(block => {
      const elem = document.getElementById(`container-${block.uid}`);
      if (elem && getOffsetTop(elem) <= fromTop) {
        currentlyActive.push(block);
      }
    });
    // and we take the last one
    const activeBlock = currentlyActive[currentlyActive.length - 1] || this.sections[0] || null;
    if (!activeBlock) {
      return null;
    }

    return activeBlock.uid;
  }

  getCoverHeight() {
    const coverImage = document.querySelector(".cover__image") as any;
    if (!coverImage) {
      return;
    }
    const height = coverImage.clientHeight;
    this.positionStyle = {top: (height || 0) + 10, position: "absolute"};
    this.setState({coverImageHeight: height} as any);
  }

  componentDidMount() {
    const coverImage = document.querySelector(".cover__image") as any;
    if (coverImage !== null) {
      coverImage.children[0].onload = this.getCoverHeight.bind(this);
    } else {
      this.setState({coverImageHeight: 0} as any);
      this.positionStyle = {top: "10px", position: "fixed"};
    }
    window.addEventListener("scroll", this.debouncedScroll);
    // cover image height change depending on screensize so we need to lisen
    // to the resize event to position the toc appropriately
    window.addEventListener("resize", this.getCoverHeight.bind(this));
  }

  componentWillUnmount() {
    window.removeEventListener("scroll", this.debouncedScroll);
    window.removeEventListener("resize", this.getCoverHeight.bind(this));
    this.debouncedScroll.cancel();
  }

  scrollTo(anchor: string, slugTitle: string, event: React.SyntheticEvent<any>) {
    event.preventDefault();
    let offsetTop = getOffsetTop(document.getElementById(anchor));
    if (this.props.context !== RenderContext.Share) {
      offsetTop -= 80; // remove the header height
    }
    window.location.hash = slugTitle;
    // See https://github.com/WeAreWizards/proppyweb/issues/450
    //
    // If we scroll to the exact position then moving up a single px
    // highlights the previous item. With floating point math this
    // sometimes happens for all headings. A 5px buffer ensures we're
    // highlighting the right item.
    zenscroll.toY(offsetTop + 5, 250);
  }

  renderTitles() {
    return this.sections.map((block, i) => {
      const isSubtitle = block.type === BLOCK_TYPES.Subtitle;
      const isH3 = block.type === BLOCK_TYPES.H3;
      const anchor = `container-${block.uid}`;
      const isActive = this.state.active ? block.uid === this.state.active : i === 0;
      const slugTitle = stripTags(block.data.value.toLowerCase()).replace(/ /g, "_");

      const classes = classnames({
        "table-of-contents__subtitle": isSubtitle,
        "table-of-contents__h3": isH3,
        "table-of-contents--highlight": isActive,
      });

      return (
        <li
          className={classes}
          key={block.uid}>
          <span onClick={this.scrollTo.bind(this, anchor, slugTitle)}>
            {stripTags(unescape(block.data.value || "Untitled"))}
          </span>
        </li>
      );
    });
  }

  render() {
    const { coverImageHeight } = this.state;
    const classes = classnames("table-of-contents", {
      "table-of-contents--hidden": coverImageHeight === null,
      // to ensure the toc is above the preview translucid bar on preview
      "table-of-contents--preview": this.props.context === RenderContext.Preview,
    });

    const scrollTop = getScrollTop();
    // Transition between fixed and absolute anchoring to stay below cover image.
    // https://github.com/WeAreWizards/proppyweb/issues/475
    if (coverImageHeight) {
      if (scrollTop > coverImageHeight && this.lastScrollPos <= coverImageHeight) {
        this.positionStyle = {top: 10, position: "fixed"};
      } else if (scrollTop <= coverImageHeight && this.lastScrollPos > coverImageHeight) {
        this.positionStyle = {top: coverImageHeight + 10, position: "absolute"};
      }
    }
    this.lastScrollPos = scrollTop;

    return (
      <div className={classes} style={this.positionStyle}>
        <ul>
          {this.renderTitles()}
        </ul>
      </div>
    );
  }
}

export default TableOfContents;
