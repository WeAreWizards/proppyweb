import * as React from "react";
import * as classnames from "classnames";

import Popover from "../core/Popover";
import EmailForm from "../core/forms/EmailForm";


import { IShare } from "../../stores/models/Proposal";
import rootStore from "../../stores/RootStore";
import router from "../../routes";

declare var __SITE_BASE_URL__: string;


interface IShareSettingsState {
  created: boolean;
  markedAsSent: boolean;
  emailSent: boolean;
  copiedClipboard: boolean;
}


export class ShareSettingsRoute extends React.Component<{}, IShareSettingsState> {
  lastShared: IShare;
  DEFAULT_BODY: string;
  DEFAULT_SUBJECT: string;

  constructor(props) {
    super(props);

    this.state = {
      created: false,
      markedAsSent: false,
      emailSent: false,
      copiedClipboard: false,
    };

    this.lastShared = rootStore.proposalStore.current.shares[rootStore.proposalStore.current.shares.length - 1];
    this.DEFAULT_BODY = `Hi,

Please have a look at our proposal {title} at the following link: {url}.

Thanks,
${rootStore.userStore.me.username}`;

    this.DEFAULT_SUBJECT = `${rootStore.companyStore.us.name} invited you to review a proposal`;
  }

  componentWillMount() {
    // window.onbeforeunload = () => {
    //   if (this.state.created) {
    //     return ""; // seems like we can't use custom text on exit popups anymore
    //   }
    // };
  }

  componentWillUnmount() {
    window.onbeforeunload = null;
  }

  getFromLastOrDefault(field: string, defaultValue: string): string {
    if (!this.lastShared || this.lastShared[field] === "") {
      return defaultValue;
    }
    // need to replace variables back
    if (field === "body") {
      return this.lastShared[field]
        .replace(new RegExp(this.getLink(), "g"), "{url}")
        .replace(new RegExp(rootStore.proposalStore.current.title, "g"), "{title}");
    }
    return this.lastShared[field];
  }

  share() {
    // Error handled in fetchling directly
    rootStore.proposalStore.publishCurrent()
      .then(() => this.setState({created: true} as any));
  }

  markAsSent() {
    rootStore.proposalStore.markAsSent()
      .then(() => {
        this.setState({markedAsSent: true} as any);
        window.onbeforeunload = null;
      });
  }

  emailClient(data: any) {
    rootStore.proposalStore.sendEmailToClient(data)
      .then(() => {
        this.setState({emailSent: true} as any);
        window.onbeforeunload = null;
      });
  }

  getLink(): string {
    return `${rootStore.companyStore.us.whitelabelDomain || __SITE_BASE_URL__}/p/${rootStore.proposalStore.current.shareUid}`;
  }

  renderEsignatureBlurb() {
    if (rootStore.blockStore.hasSignature) {
      return (
        <p>This proposal <b>can be signed</b>. Remove the signature block in the editor to disable signing.</p>
      );
    }

    return (
      <p>This proposal <b>cannot be signed</b>. Add a signature block in the editor to enable signing.</p>
    );
  }

  renderCreateStep() {
    const created = this.state.created;
    if (created) {
      return null;
    }

    const classes = classnames("share-settings__mail", {
      "share-settings--disabled": created,
    });
    const buttonClasses = classnames("button", {"button--disabled": created});
    const previousVersion = this.lastShared ? this.lastShared.version : 0;

    return (
      <div className={classes}>
        <p>
          You are about to publish <b>version {previousVersion + 1}</b> of <b>{rootStore.proposalStore.current.title}</b>.
          {previousVersion > 0 ? "This will replace the previous version." : ""}
        </p>
        {this.renderEsignatureBlurb()}
        <br/>
        <br/>
        <button className={buttonClasses} onClick={this.share.bind(this)} disabled={created}>Publish</button>
      </div>
    );
  }

  copyLink() {
    (this.refs["share-link-input"] as HTMLInputElement).select();
    document.execCommand("copy");

    this.setState({copiedClipboard: true} as any);

    setTimeout(() => {
      this.setState({copiedClipboard: false} as any);
    }, 2000);
  }

  renderCopyLink() {
    const { markedAsSent, copiedClipboard } = this.state;
    return (
      <div>
        <p>A new version of the proposal has been published at the following private URL:</p>
        <div className="text-input text-input--active copy-link">
          <input
            ref="share-link-input"
            className="share-link-input"
            onClick={(event: any) => event.target.select()}
            type="text"
            value={this.getLink()}
            readOnly />
          <span className="icon-duplicate" onClick={this.copyLink.bind(this)} />
          <Popover hidden={!copiedClipboard}>Copied</Popover>
          {markedAsSent
            ? <span><b>Marked as sent</b></span>
            : <button className="button" onClick={this.markAsSent.bind(this)}>Mark as sent</button>
          }
        </div>
      </div>
    );
  }

  renderEmailSent() {
    const shareUid = rootStore.proposalStore.current.shareUid;
    return (
      <div>
        <p>The email has been sent!</p>
        <br/>
        <button className="button"
                onClick={() => router.navigate("proposal", {shareUid}, {replace: true})}>
          Go to my shared proposal
        </button>
      </div>
    );
  }

  renderClientEmails() {
    if (!rootStore.proposalStore.current.clientId) {
      return null;
    }
    const client = rootStore.clientStore.getClient(rootStore.proposalStore.current.clientId);
    if (client.source === "") {
      return null;
    }
    const contacts = rootStore.clientStore.getContactsFrom(client.source);
    if (contacts.length === 0) {
      return null;
    }

    return (
      <div className="contacts-emails">
        <h5>Contacts</h5>
        <ul>
        {
          contacts.map((c, i) => {
            return (<li key={i}><b>{c.name}</b> — {c.email}</li>);
          })
        }
        </ul>
      </div>
    );
  }

  renderEmailForm() {
    return (
      <div>
        <p>
          The variable <b>{`{url}`}</b> is available to represent the published
          proposal URL and is mandatory in the body of the email. <br/>
          The variable <b>{`{title}`}</b> is also available.
        </p>

        {this.renderClientEmails()}

        <EmailForm
          url={this.getLink()}
          title={rootStore.proposalStore.current.title}
          writerEmail={rootStore.userStore.me.email}
          onSubmit={this.emailClient.bind(this)}
          emails={this.lastShared ? this.lastShared.sentTo : []}
          subject={this.getFromLastOrDefault("subject", this.DEFAULT_SUBJECT)}
          body={this.getFromLastOrDefault("body", this.DEFAULT_BODY)}
          from={this.getFromLastOrDefault("from", rootStore.userStore.me.username)} />
      </div>
    );
  }

  renderEmailStep() {
    const { created, emailSent } = this.state;
    if (!created) {
      return null;
    }

    return (
      <div className="share-settings__mail">
        {this.renderCopyLink()}
        <h4>Send by email</h4>
        {emailSent ? this.renderEmailSent() : this.renderEmailForm()}
      </div>
    );
  }

  render() {
    return (
      <div className="share-settings">
        <h1>{this.state.created ? "Done!" : "Publish proposal"}</h1>
        {this.renderCreateStep()}
        {this.renderEmailStep()}
      </div>
    );
  }
}

export default ShareSettingsRoute;
