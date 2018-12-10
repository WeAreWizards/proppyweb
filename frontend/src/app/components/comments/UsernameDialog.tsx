import * as React from "react";

import Dialog from "../core/Dialog";
import TextInput from "../core/forms/TextInput";


interface IUsernameDialogProps extends React.Props<{}> {
  onCancel: () => void;
  onSubmit: (username: string) => void;
}

interface IUsernameDialogState {
  username: string;
}


export class UsernameDialog extends React.Component<IUsernameDialogProps, IUsernameDialogState> {
  constructor(props) {
    super(props);
    this.state = {username: ""};
  }

  setUsername(event: React.SyntheticEvent<any>) {
    event.preventDefault();
    const username = this.state.username;
    if (username === "") {
      return;
    }
    this.props.onSubmit(username);
  }

  render() {
    const { onCancel } = this.props;
    const noUsername = this.state.username === "";

    const actions = [
      {label: "Comment", onClick: this.setUsername.bind(this), disabled: noUsername},
    ];

    return (
      <Dialog title="Hello there" actions={actions} onClose={onCancel}>
        <p>We need to you to pick a name so we know who's commenting</p>
        <br/><br/>
        <form className="username-dialog" onSubmit={this.setUsername.bind(this)}>
          <TextInput
              label="Username"
              type="text"
              name="username"
              autoFocus={true}
              onChange={username => { this.setState({username}); }}
              value={this.state.username} />
        </form>
      </Dialog>
    );
  }
}

export default UsernameDialog;
