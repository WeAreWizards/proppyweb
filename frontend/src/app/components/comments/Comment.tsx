import * as React from "react";

import { formatDDMMMYYYY } from "../../utils/dates";
import { SharedComment } from "../../stores/models/Comment";


interface ICommentProps extends React.Props<{}> {
  comment: SharedComment;
  username: string;
}

// TODO: different colour if from client?
export class Comment extends React.Component<ICommentProps, {}> {
  render() {
    const { comment, username } = this.props;

    return (
      <div className="comment">
        <div className="comment__username">{ username }
        <span className="comment__time"> on {formatDDMMMYYYY(comment.createdAt)}</span>:</div>
        <span className="comment__content">{ comment.comment }</span>
      </div>
    );
  }
}

export default Comment;
