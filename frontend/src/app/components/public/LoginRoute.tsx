import * as React from "react";

import FormContainer from "./FormContainer";
import TextForm from "../core/forms/TextForm";
import Link from "../core/Link";
import fetchling from "../../utils/fetchling";
import { ILoggedOutFormState } from "../../interfaces";
import rootStore from "../../stores/RootStore";
import router, {Routes} from "../../routes";


export class LoginRoute extends React.Component<{}, ILoggedOutFormState> {
  inputs: any;

  constructor(props: any) {
    super(props);
    this.inputs = {
      email: {
        type: "email",
        label: "Email",
      },
      password: {
        type: "password",
        label: "Password",
        minLength: 8,
      },
    };
    this.state = {submitted: false, errors: null};
  }

  componentDidMount() {
    document.title = `Proppy - Login`;
  }

  componentWillUpdate(nextProps: any, nextState: ILoggedOutFormState) {
    if (nextState.submitted) {
      router.navigate("home");
    }
  }

  submit(data: any) {
    const { email, password } = data;
    this.setState({disabledForSubmit: true} as any);

    fetchling("/tokens").post({email, password})
      .then((payload: any) => {
        rootStore.userStore.login(payload.user);
        this.setState({submitted: true, disabledForSubmit: false});
      })
      .catch(err => {
        if (err.errors) {
          this.setState({errors: err.errors.errors, disabledForSubmit: false});
        }
      });
  }

  render() {
    return (
      <FormContainer title="Sign in">
        <p>Proppy is shutting down on December 1st 2018.</p>
        <TextForm
          inputs={this.inputs}
          onSubmit={this.submit.bind(this)}
          errors={this.state.errors}
          disabledForSubmit={this.state.disabledForSubmit}
          submitText="Sign in" />
        <br/>
        <p>
          <Link to={Routes.ForgotPassword}>I forgot my password</Link>
          &nbsp;| <Link to={Routes.ResendActivation}>Resend me the activation email</Link>
        </p>
      </FormContainer>
    );
  }
}

export default LoginRoute;
