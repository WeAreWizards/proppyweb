import * as React from "react";

import CommentForm from "./CommentForm";
import Comment from "./Comment";
import { isDescendantOfClass } from "../../utils/html";
import { KEY_CODES } from "../../constants/events";
import rootStore from "../../stores/RootStore";
import { SharedCommentThread } from "../../stores/models/Comment";


interface ICommentBoxProps {
  isSharedPage: boolean;
  uid: string;
  thread: SharedCommentThread | null;
}


export class CommentBox extends React.Component<ICommentBoxProps, {}> {
  constructor(props) {
    super(props);
    this.closeIfClickedOutside = this.closeIfClickedOutside.bind(this);
    this.closeOnEscape = this.closeOnEscape.bind(this);
    document.body.addEventListener("click", this.closeIfClickedOutside);
    document.body.addEventListener("keydown", this.closeOnEscape);
  }

  componentWillUnmount() {
    document.body.removeEventListener("click", this.closeIfClickedOutside);
    document.body.removeEventListener("keydown", this.closeOnEscape);
    rootStore.uiStore.closeComments();
  }

  closeOnEscape(event: KeyboardEvent) {
    if (event.which === KEY_CODES.Escape) {
      rootStore.uiStore.closeComments();
      return;
    }
  }

  closeIfClickedOutside(event: Event) {
    if (isDescendantOfClass(event.target as any, "comment-box") || isDescendantOfClass(event.target as any, "dialog")) {
      return;
    }
    rootStore.uiStore.closeComments();
  }

  renderComments() {
    const { thread } = this.props;
    if (thread === null) {
      return null;
    }

    const comments = [];
    thread.comments.map(comment => {
      comments.push(
        <Comment key={comment.id} comment={comment} username={comment.username} />,
      );
    });
    return comments;
  }

  render() {
    const { thread, isSharedPage, uid } = this.props;
    const threadId = thread !== null ? thread.id : null;

    return (
      <div className="comment-box">
        {this.renderComments()}
        {rootStore.sharedStore.isLatest
          ? <CommentForm blockUid={uid} threadId={threadId} isSharedPage={isSharedPage}/>
          : null}
      </div>
    );
  }
}

export default CommentBox;
