import * as React from "react";

import FormContainer from "./FormContainer";
import Link from "../core/Link";
import fetchling from "../../utils/fetchling";
import rootStore from "../../stores/RootStore";
import {Routes} from "../../routes";

enum ActivationState {
  None,
  Failed,
  Success,
}

interface IActivateRouteState {
  status: ActivationState;
}

export class ActivateRoute extends React.Component<{}, IActivateRouteState> {
  constructor(props) {
    super(props);
    this.state = {status: ActivationState.None};
  }

  componentDidMount() {
    document.title = `Proppy - Account activation`;
  }

  componentWillMount() {
    const token = rootStore.routerStore.current.params.token;

    fetchling(`/activate/${token}`).post()
      .then(() => this.setState({status: ActivationState.Success}))
      .catch(() => this.setState({status: ActivationState.Failed}));
  }

  render() {
    const status = this.state.status;
    let text = "";

    if (status === ActivationState.Failed) {
      text = "The activation has failed";
    }
    if (status === ActivationState.Success) {
      text = "Activation successful";
    }

    return (
      <FormContainer title="Account activation">
        <p className="text-center">
          {text}
          <br />
          <br />
          {status === ActivationState.Success ? <Link to={Routes.SignIn}>Sign in here</Link> : null}
        </p>
      </FormContainer>
    );
  }
}

export default ActivateRoute;
