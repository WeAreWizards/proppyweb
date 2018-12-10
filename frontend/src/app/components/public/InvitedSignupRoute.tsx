import * as React from "react";

import FormContainer from "./FormContainer";
import ServerError from "./ServerError";
import TextForm from "../core/forms/TextForm";
import Link from "../core/Link";
import fetchling from "../../utils/fetchling";
import { getCompanyName } from "../../utils/auth";
import { ILoggedOutFormState } from "../../interfaces";
import rootStore from "../../stores/RootStore";
import router, {Routes} from "../../routes";


export class InvitedSignupRoute extends React.Component<{}, ILoggedOutFormState> {
  inputs: any;

  constructor(props: {}) {
    super(props);
    this.inputs = {
      username: {
        type: "text",
        label: "Username",
      },
      password: {
        type: "password",
        label: "Password",
        note: "Minimum 8 characters",
        minLength: 8,
      },
    };
    this.state = {disabledForSubmit: false, errors: null, submitted: false};
  }

  componentDidMount() {
    document.title = `Proppy - Join your team`;
  }

  submit(data: any) {
    const token = rootStore.routerStore.current.params.token;
    const { username, password } = data;
    fetchling("/invited-users").post({username, password, token})
      .then((payload: any) => {
        rootStore.userStore.login(payload.user);
        router.navigate("home");
      })
      .catch(err => {
        if (err.errors) {
          this.setState({ errors: err.errors.errors, disabledForSubmit: false });
        }
      });
  }


  render() {
    const company = getCompanyName(rootStore.routerStore.current.params.token);

    if (!company) {
      return (
      <FormContainer title="Invalid token">
        <p>The token used is invalid.</p>
        <p><Link to={Routes.SignIn}>I have an account, sign in</Link></p>
      </FormContainer>
      );
    }

    const { errors } = this.state;
    let tokenError = null;
    if (errors && errors.token) {
      tokenError = errors.token[0];
    }

    return (
      <FormContainer title="Sign up">
        <p>Hey, <span className="primary">{company}</span> invited you to collaborate on Proppy</p>
        <ServerError error={tokenError} />
        <TextForm
          inputs={this.inputs}
          errors={this.state.errors}
          onSubmit={this.submit.bind(this)}
          submitText="Sign up" />
        <p><Link to={Routes.SignIn}>I have an account, sign in</Link></p>
      </FormContainer>
    );
  }
}

export default InvitedSignupRoute;
