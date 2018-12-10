import * as React from "react";


import FormContainer from "./FormContainer";
import TextForm from "../core/forms/TextForm";
import Link from "../core/Link";
import fetchling from "../../utils/fetchling";
import { ILoggedOutFormState } from "../../interfaces";
import {Routes} from "../../routes";



export class RequestResetPasswordRoute extends React.Component<{}, ILoggedOutFormState> {
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
    document.title = `Proppy - Request password reset`;
  }

  submit(data) {
    fetchling("/request-reset-password").post({email: data.email})
      .then(() => this.setState({submitted: true, error: null}))
      .catch(err => {
        if (err.errors) {
          this.setState({ errors: err.errors.errors, disabledForSubmit: false });
        }
      });
  }

  renderText() {
    if (this.state.submitted === false) {
      return <p>We'll send you an email to reset your password.</p>;
    }

    return <p>We have sent you an email with a link to reset your password</p>;
  }

  render() {
    const submitted = this.state.submitted;

    return (
      <FormContainer title={submitted ? "Great!" : "Forgot your password?"}>
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

export default RequestResetPasswordRoute;
