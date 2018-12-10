import * as React from "react";
import { observer } from "mobx-react";
import { observable } from "mobx";
import TextareaAutosize from "react-autosize-textarea";

import {
  getAnonymousUsername,
  needsAnonymousUsername,
  setAnonymousUsername,
} from "../../utils/auth";


import rootStore from "../../stores/RootStore";
import {UsernameDialog} from "./UsernameDialog";


interface ICommentFormProps {
  blockUid: string;
  threadId: number | null;
  isSharedPage: boolean;
}

@observer
export class CommentForm extends React.Component<ICommentFormProps, {}> {
  @observable showUsernameDialog: boolean = false;

  componentDidMount() {
    // We get the <TextareaAutosize> so we need to get its refs
    const input = this.refs["comment"] as any;
    if (input) {
      // Needed for firefox
      setTimeout(() => {
        input.textarea.focus();
      }, 0);
    }
  }

  getCommentText() {
    const input = this.refs["comment"] as any;
    return input.textarea.value.trim();
  }

  clearInput() {
    const input = this.refs["comment"] as any;
    input.textarea.value = "";
  }

  handleSubmit(event: React.FormEvent<any>) {
    event.preventDefault();
    const value = this.getCommentText();
    // No empty comments
    if (value === "") {
      return;
    }
    const { blockUid, threadId, isSharedPage } = this.props;
    if (isSharedPage && needsAnonymousUsername()) {
      this.showUsernameDialog = true;
      return;
    }

    rootStore.commentStore.addSharedComment(blockUid, value, threadId, getAnonymousUsername())
      .then(() => this.clearInput())
      .catch(() => this.clearInput());
  }

  finishAddingAnonymousComment(username: string) {
    setAnonymousUsername(username);
    const value = this.getCommentText();
    rootStore.commentStore.addSharedComment(this.props.blockUid, value, this.props.threadId, username)
      .then(() => this.clearInput())
      .catch(() => this.clearInput());
    this.showUsernameDialog = false;
  }

  getUsername(): string {
    return rootStore.userStore.me ? rootStore.userStore.me.username : getAnonymousUsername() || "Anonymous";
  }

  renderAskForUsername() {
    if (!this.showUsernameDialog) {
      return;
    }

    const cancel = () => {
      this.showUsernameDialog = false;
    };

    const finish = (username: string) => {
      this.finishAddingAnonymousComment(username);
      this.showUsernameDialog = false;
    };

    return <UsernameDialog onCancel={cancel} onSubmit={finish} />;
  }

  render() {
    const { isSharedPage } = this.props;

    let placeholder = "Your client won't see this comment";
    if (isSharedPage) {
      placeholder = "This comment will be public";
    }

    return (
      <form className="comment-form" onSubmit={this.handleSubmit.bind(this)}>
        {this.renderAskForUsername()}
        <span className="comment-form__username">{this.getUsername()}:</span>
        <TextareaAutosize ref="comment" placeholder={placeholder} />
        <input className="button" type="submit" value="Post" />
      </form>
    );
  }
}

export default CommentForm;
