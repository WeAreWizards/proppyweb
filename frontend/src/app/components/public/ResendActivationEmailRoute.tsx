import * as React from "react";

import FormContainer from "./FormContainer";
import TextForm from "../core/forms/TextForm";
import fetchling from "../../utils/fetchling";
import Link from "../core/Link";

import { ILoggedOutFormState } from "../../interfaces";
import {Routes} from "../../routes";


export class ResendActivationEmailRoute extends React.Component<{}, ILoggedOutFormState> {
  inputs: any;

  constructor(props) {
    super(props);
    this.inputs = {
      email: {
        type: "email",
        label: "Email",
      },
    };
    this.submit = this.submit.bind(this);
    this.state = {disabledForSubmit: false, errors: null, submitted: false};
  }

  componentDidMount() {
    document.title = `Proppy - Resend activation email`;
  }

  submit(data) {
    fetchling("/resend-activation-email").post({email: data.email})
      .then(() => this.setState({submitted: true, error: null}))
      .catch(payload => this.setState({ errors: payload.errors.errors, disabledForSubmit: false }));
  }

  renderText() {
    if (this.state.submitted === false) {
      return (<p>No worries, we'll send you another one.</p>);
    }

    return <p>We have sent you another email. Check your inbox!</p>;
  }

  render() {
    const submitted = this.state.submitted;

    return (
      <FormContainer title={submitted ? "Great!" : "Didn't receive the activation email?"}>
        {this.renderText()}
        {submitted
          ? null
          : <TextForm
              inputs={this.inputs}
              errors={this.state.errors}
              onSubmit={this.submit}
              submitText="Submit" />
        }
        <p><Link to={Routes.SignIn}>Back to login</Link></p>
      </FormContainer>
    );
  }
}

export default ResendActivationEmailRoute;
