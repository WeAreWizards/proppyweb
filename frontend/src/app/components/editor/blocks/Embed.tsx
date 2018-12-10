import * as React from "react";
import { debounce } from "lodash";
import { observable } from "mobx";
import { observer } from "mobx-react";


import ContentEditable from "./ContentEditable";
import { BLOCK_TYPES } from "../../../constants/blocks";
import { EmbedBlock } from "../../../stores/models/Block";
import rootStore from "../../../stores/RootStore";
import TextForm from "../../core/forms/TextForm";
import { getEmbedUrl, isUrl } from "../../../utils/embed";
import fetchling from "../../../utils/fetchling";


interface IEmbedProps {
  block: EmbedBlock;
}


@observer
export class Embed extends React.Component<IEmbedProps, {}> {
  @observable url = "";
  @observable hasEmbed = false;
  @observable waiting = false;
  @observable embedError = false;

  INPUTS: any;
  debouncedOnChange: any;

  constructor(props) {
    super(props);
    if (props.block.data.url) {
      this.hasEmbed = true;
      this.url = props.block.data.url;
    }

    this.INPUTS =  {
      url: {
        type: "url",
        label: "Embed url",
        note: "If you do not see anything below after a few seconds, it means embedding this URL is not possible",
        initial: this.url,
      },
    };

    this.debouncedOnChange = debounce((state) => this.onChange(state), 500);
  }

  getUrl(url: string): string | Promise<string> {
    // TODO: check if url starts with <iframe and if so
    // get the iframe src
    if (url === "" || !isUrl(url)) {
      return "";
    }

    // Maybe we can get the embed url from the frontend?
    const embedUrl = getEmbedUrl(url);
    if (url !== embedUrl) {
      return embedUrl;
    }

    // Nop we can't, ask the backend whether it's a site we know
    // If we don't, just return the url
    this.waiting = true;
    return fetchling(`/proposals/embed`).get({url})
      .then(response => {
        this.waiting = false;
        return response.url;
      })
      .catch(() => {
        this.waiting = false;
        this.embedError = true;
        return url;
      });
  }

  onEnter(event: React.FocusEvent<any>) {
    event.preventDefault();
    rootStore.blockStore.addBlock(this.props.block.uid, BLOCK_TYPES.Paragraph);
  }

  addEmbedUrl() {
    rootStore.blockStore.setEmbedUrl(this.props.block.uid, this.url);
    this.hasEmbed = true;
  }

  onChange(state: any) {
    this.embedError = false;
    const url = this.getUrl(state["url"]);
    if (typeof url === "string") {
      this.url = url;
    } else {
      url.then(newUrl => {
        this.url = newUrl;
      });
    }
  }

  renderEmbedForm() {
    const disabled = this.waiting
      || this.url === ""
      || !isUrl(this.url)
      || this.url === this.props.block.data.url;

    return (
      <div>
        <TextForm
          inline={true}
          inputs={this.INPUTS}
          onSubmit={this.addEmbedUrl.bind(this)}
          onChange={this.debouncedOnChange}
          disabled={disabled}
          submitText={"Save"} />
      </div>
    );
  }

  renderIframe() {
    if (this.embedError) {
      // Happens when we ask the server for a URL it returns an exception
      // when fetching a page
      return (
        <div>
          <b>The url { this.url } is invalid or can't be loaded.</b>
        </div>
      );
    }

    if (this.url === "") {
      return null;
    }

    return (
      <iframe src={this.url} frameBorder="0">
          <div><b>The url {this.url} can't be loaded.</b></div>
      </iframe>
    );
  }

  render() {
    const { uid, proposalId, data } = this.props.block;

    return (
      <div className="embed-editor">
        {this.hasEmbed ? null : this.renderEmbedForm()}

        {this.renderIframe()}
        {this.embedError || this.url === ""
          ? null
          : <ContentEditable
            id={uid}
            proposalId={proposalId}
            tag="figcaption"
            onEnter={this.onEnter.bind(this)}
            update={(val: string) => rootStore.blockStore.updateText(uid, val, true)}
            value={data.caption || ""}
            placeholder="A caption (optional)"/>
        }
      </div>
    );
  }
}


export default Embed;
