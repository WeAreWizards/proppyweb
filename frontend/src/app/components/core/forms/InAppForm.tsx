import * as React from "react";

import TextForm from "./TextForm";


enum FormState {
  EDITING,
  SUBMITTING,
}

interface IInAppFormProps extends React.Props<{}> {
  inputs: any;
  onSubmit: (data: any) => Promise<any>;
  submitText: string;
  inline?: boolean;
  resetOnSuccess?: boolean;
}

interface IInAppFormState {
  formState: FormState;
  errors: any;
  formId: number; // For re-setting form by giving it a new ID
}


// Wrapper around TextForm to work inside the app where to need to display
// notifications, call actions etc
export class InAppForm extends React.Component<IInAppFormProps, IInAppFormState> {
  constructor(props) {
    super(props);
    // Note formID: By changing the ID we reset the form to its
    // original state after submit (see
    // e.g. http://stackoverflow.com/questions/21749798/how-can-i-reset-a-react-component-including-all-transitively-reachable-state)
    this.state = {formState: FormState.EDITING, errors: {}, formId: null};
  }

  submit(data: any) {
    const { onSubmit, resetOnSuccess } = this.props;
    this.setState({ formState: FormState.SUBMITTING } as any);

    onSubmit(data)
      .then(() => {
        this.setState({
          errors: null,
          formState: FormState.EDITING,
          formId: resetOnSuccess ? Date.now() : null,
        });
      })
      .catch(response => {
        if (response.errors) {
          this.setState({ errors: response.errors.errors, formState: FormState.EDITING } as any);
        } else {
          this.setState({ formState: FormState.EDITING } as any);
        }
      });
  }

  render() {
    const { inline, submitText, inputs } = this.props;
    const { formId, errors, formState } = this.state;

    return (
      <TextForm
        inline={inline}
        key={formId}
        inputs={inputs}
        onSubmit={this.submit.bind(this)}
        errors={errors}
        disabledForSubmit={formState === FormState.SUBMITTING}
        submitText={submitText} />
    );
  }
}

export default InAppForm;
