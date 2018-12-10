import * as React from "react";
import { observer } from "mobx-react";
import { observable } from "mobx";


import rootStore from "../../../stores/RootStore";
import Dialog from "../../core/Dialog";


interface ISlackIntegrationProps {
  close: any;
}


@observer
export class SlackIntegration extends React.Component<ISlackIntegrationProps, {}> {
  @observable oauthInProgress = false;

  updateEvents(event: React.FormEvent<any>) {
    event.preventDefault();
    const postOnComment = (this.refs["comment"] as HTMLInputElement).checked;
    const postOnView = (this.refs["view"] as HTMLInputElement).checked;
    const postOnSignature = (this.refs["signature"] as HTMLInputElement).checked;
    rootStore.companyStore.updateSlackEvents(postOnView, postOnComment, postOnSignature);
  }

  openSlackWindow(event: React.MouseEvent<any>) {
    event.preventDefault();
    // a string to identify the company that just added slack in the oauth response
    const state = rootStore.companyStore.us.id;
    const popup = window.open(
      `https://slack.com/oauth/authorize?scope=incoming-webhook&client_id=2639475339.106087107473&state=${state}`,
    );
    popup.focus();
    this.oauthInProgress = true;

    // and we listen on the popup close event to know when to re-fetch client
    const intervalId = window.setInterval(() => {
      if (popup.closed) {
        this.oauthInProgress = false;
        clearInterval(intervalId);
        rootStore.companyStore.fetchUs();
      }
    }, 200);
  }

  renderNotIntegrated() {
    return (
      <div className="integration-dialog__body">
        <p>Be notified in Slack when people view, comment or sign your proposals.</p>
        <p className="oauth-button-container">
          <a className="oauth-button" onClick={this.openSlackWindow.bind(this)}>
            <img alt="Add to Slack"
                 height="40"
                 width="139"
                 src="https://platform.slack-edge.com/img/add_to_slack@2x.png" />
          </a>
        </p>
      </div>
    );
  }

  renderIntegrated() {
    const {
      channel, teamName, postOnComment, postOnView, postOnSignature,
    } = rootStore.companyStore.us.integrations.slack;

    return (
      <div className="integration-dialog__body">
        <div className="disable-integration">
          <button className="button button--dangerous"
                  onClick={() => rootStore.companyStore.disableSlackIntegration()}>
            Disable
          </button>
        </div>
        <p>
          Notifications will be pushed to the channel <span className="slack-channel">#{channel}</span>&nbsp;
          of team <span className="slack-team">{teamName}</span>. <br/>
          To change the channel or the team, please disable and re-enable the integration.
        </p>

        <form className="slack-form" onSubmit={this.updateEvents.bind(this)}>
          <label>
            <input ref="view" type="checkbox" name="view" defaultChecked={postOnView}/>
            Proposal viewed
          </label>
          <label>
            <input ref="comment" type="checkbox" name="comment" defaultChecked={postOnComment}/>
            Comment on a proposal
          </label>
          <label>
            <input ref="signature" type="checkbox" name="signature" defaultChecked={postOnSignature}/>
            Proposal signed
          </label>
          <input type="submit" className="button" value="Save"/>
        </form>
      </div>
    );
  }

  render() {
    const hasIntegration = rootStore.companyStore.us.integrations.slack !== null;
    return (
      <Dialog actions={[]} onClose={this.props.close}>
        <div className="integration-dialog">
          <div className="integration-dialog__header">
            <img src="/img/slack-logo@2x.png" alt="Slack logo"/>
            <div>
              <h3>Slack</h3>
            </div>
          </div>

          {hasIntegration ? this.renderIntegrated() : this.renderNotIntegrated()}
        </div>
      </Dialog>
    );
  }
}

export default SlackIntegration;
