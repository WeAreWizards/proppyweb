import * as React from "react";
import { observable } from "mobx";
import { observer } from "mobx-react";

import Dialog from "../../core/Dialog";
import TextArea from "../../core/forms/TextArea";
import rootStore from "../../../stores/RootStore";


interface ICancelDialogProps extends React.Props<{}> {
  onCancel: () => void;
}

@observer
export class CancelDialog extends React.Component<ICancelDialogProps, {}> {
  @observable feedback: string = "";

  cancel() {
    rootStore.billingStore.cancel(this.feedback)
      .then(() => this.props.onCancel())
      .catch(() => this.props.onCancel());
  }

  render() {
    const actions = [
      {label: "Cancel subscription", onClick: this.cancel.bind(this), disabled: this.feedback.trim() === ""},
    ];

    return (
      <Dialog title="Cancel subscription" actions={actions} onClose={this.props.onCancel}>
        <p className="cancel-plan-text">
          We're sad to see you go. Would you be able to tell us why you're leaving so we can improve?
        </p>
        <TextArea onChange={(val) => this.feedback = val}
                  label="Feedback"
                  name="feedback"
                  canResize={false}
                  value={this.feedback}
                  rows={4}/>
      </Dialog>
    );
  }
}

export default CancelDialog;
