import * as React from "react";


import FormContainer from "./FormContainer";
import ServerError from "./ServerError";
import TextForm from "../core/forms/TextForm";
import fetchling from "../../utils/fetchling";
import Link from "../core/Link";
import rootStore from "../../stores/RootStore";

import {ILoggedOutFormState} from "../../interfaces";
import {Routes} from "../../routes";


export class ResetPasswordRoute extends React.Component<{}, ILoggedOutFormState> {
  inputs: any;

  constructor(props) {
    super(props);
    this.inputs = {
      password: {
        type: "password",
        note: "Minimum 8 characters",
        label: "Password",
        minLength: 8,
      },
    };
    this.state = {disabledForSubmit: false, errors: null, submitted: false};
    this.submit = this.submit.bind(this);
  }

  componentDidMount() {
    document.title = `Proppy - Reset my password`;
  }

  submit(data) {
    const payload = {
      password: data.password,
      token: rootStore.routerStore.current.params.token,
    };

    fetchling("/reset-password").post(payload)
      .then(() => this.setState({submitted: true, errors: null}))
      .catch(err => this.setState({errors: err.errors.errors, submitted: false}));
  }

  render() {
    const submittedText = (
      <p>
        Your password has been reset. You can now <Link to={Routes.SignIn}>sign in</Link>.
      </p>
    );

    const { errors, submitted } = this.state;
    let tokenError = null;
    if (errors && errors.token) {
      tokenError = errors.token[0];
    }

    return (
      <FormContainer title={submitted ? "Great!" : "Reset password"}>
        <ServerError error={tokenError} />
        {submitted
          ? submittedText
          : <TextForm
              inputs={this.inputs}
              errors={errors}
              onSubmit={this.submit}
              submitText="Set new password" />
        }
      </FormContainer>
    );
  }
}

export default ResetPasswordRoute;
