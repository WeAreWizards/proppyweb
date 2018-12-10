import * as React from "react";
import { observer } from "mobx-react";
import DevTools from "mobx-react-devtools";

import {Routes} from "./routes";
import rootStore from "./stores/RootStore";

import AppRoute from "./components/app/AppRoute";
import DashboardRoute from "./components/dashboard/DashboardRoute";
import AnalyticsRoute from "./components/analytics/AnalyticsRoute";
import EditorRoute from "./components/editor/EditorRoute";
import PreviewRoute from "./components/publishing/PreviewRoute";
import ShareRoute from "./components/publishing/ShareRoute";
import ShareSettingsRoute from "./components/publishing/ShareSettingsRoute";
import AccountRoute from "./components/settings/AccountRoute";
import CompanyRoute from "./components/settings/CompanyRoute";
import TeamRoute from "./components/settings/TeamRoute";
import ClientsRoute from "./components/settings/ClientsRoute";
import BrandingRoute from "./components/settings/BrandingRoute";
import BillingRoute from "./components/settings/BillingRoute";
import IntegrationRoute from "./components/settings/IntegrationRoute";
import ActivateRoute from "./components/public/ActivateRoute";
import LoginRoute from "./components/public/LoginRoute";
import SignupRoute from "./components/public/SignupRoute";
import InvitedSignupRoute from "./components/public/InvitedSignupRoute";
import RequestResetPasswordRoute from "./components/public/RequestResetPasswordRoute";
import ResendActivationEmailRoute from "./components/public/ResendActivationEmailRoute";
import ResetPasswordRoute from "./components/public/ResetPasswordRoute";

declare var __DEVTOOLS__: boolean;

@observer
class Root extends React.Component<{}, {}> {
  render() {
    if (!rootStore.routerStore.current) {
      return null;
    }

    let component = null;
    switch (rootStore.routerStore.current.name as Routes) {
      case Routes.Home:
        component = <AppRoute><DashboardRoute/></AppRoute>;
        break;
      case Routes.SettingsTeam:
        component = <AppRoute><TeamRoute/></AppRoute>;
        break;
      case Routes.SettingsAccount:
        component = <AppRoute><AccountRoute/></AppRoute>;
        break;
      case Routes.SettingsCompany:
        component = <AppRoute><CompanyRoute/></AppRoute>;
        break;
      case Routes.SettingsClients:
        component = <AppRoute><ClientsRoute/></AppRoute>;
        break;
      case Routes.SettingsBranding:
        component = <AppRoute><BrandingRoute/></AppRoute>;
        break;
      case Routes.SettingsBilling:
        component = <AppRoute><BillingRoute/></AppRoute>;
        break;
      case Routes.SettingsIntegration:
        component = <AppRoute><IntegrationRoute/></AppRoute>;
        break;
      case Routes.Editor:
        component = <AppRoute><EditorRoute/></AppRoute>;
        break;
      case Routes.Analytics:
        component = <AppRoute><AnalyticsRoute/></AppRoute>;
        break;
      case Routes.PublishSettings:
        component = <AppRoute><ShareSettingsRoute/></AppRoute>;
        break;
      case Routes.Preview:
        component = <PreviewRoute/>;
        break;
      case Routes.Proposal:
      case Routes.ProposalVersioned:
        component = <ShareRoute/>;
        break;
      case Routes.SignIn:
        component = <AppRoute><LoginRoute/></AppRoute>;
        break;
      case Routes.ForgotPassword:
        component = <AppRoute><RequestResetPasswordRoute/></AppRoute>;
        break;
      case Routes.SignUp:
        component = <AppRoute><SignupRoute/></AppRoute>;
        break;
      case Routes.ResetPassword:
        component = <AppRoute><ResetPasswordRoute/></AppRoute>;
        break;
      case Routes.ResendActivation:
        component = <AppRoute><ResendActivationEmailRoute/></AppRoute>;
        break;
      case Routes.Activate:
        component = <AppRoute><ActivateRoute/></AppRoute>;
        break;
      case Routes.InvitedSignup:
        component = <AppRoute><InvitedSignupRoute/></AppRoute>;
        break;
    }

    return (
      <div>
        {component}
        {__DEVTOOLS__ ? <DevTools /> : null}
      </div>
    );
  }
}

export default Root;
