import createRouter, {PluginFactory, Router, State} from "router5";
// tslint:disable-next-line
import browserPlugin from "router5/plugins/browser";

import rootStore from "./stores/RootStore";
import { isLoggedIn } from "./utils/auth";


// Tell MobX which page we're on
export function mobxRouterPlugin(router: Router) {
  return {
    onTransitionError: (toState: State, fromState: State, err: any) => {
      // uiStore.notify("Could not load page. Try again later", true);
      router.cancel();
    },
    onTransitionSuccess: (toState: State) => {
      rootStore.routerStore.setCurrent(toState);
    },
  };
}
(mobxRouterPlugin as PluginFactory).pluginName = "MOBX_PLUGIN";

const asyncMiddleware = (routes: Array<any>) => (router: Router) => (toState: any, fromState: State, done: any) => {
  const route = routes.find((r) => r.name === toState.name);
  if (route && route.onActivate) {
    rootStore.routerStore.startAsyncLoading();
    return route.onActivate(toState.params)
      .catch((err: any) => done({code: "TRANSITION_ERR", error: err}));
  }
  done();
};

const loggedInRequired = () => (toState: State, fromState: State, done: any) => {
  // userIsLoggedIn can be whatever you need it to be
  if (isLoggedIn()) {
    return true;
  }

  // redirect to signin page if the user isn't logged in
  done({redirect: {name: "signin"}});
};

const loggedOutRequired = () => (toState: State, fromState: State, done: any) => {
  // userIsLoggedIn can be whatever you need it to be
  if (isLoggedIn()) {
    done({redirect: {name: "home"}});
  }
  return true;
};

export enum Routes {
  Home = "home",

  SettingsIntegration = "settings-integrations",
  SettingsBilling = "settings-billing",
  SettingsBranding = "settings-branding",
  SettingsClients = "settings-clients",
  SettingsCompany = "settings-company",
  SettingsTeam = "settings-team",
  SettingsAccount = "settings-account",

  Editor = "editor",
  Analytics = "analytics",
  PublishSettings = "publish-settings",
  Preview = "preview",
  Proposal = "proposal",
  ProposalVersioned = "proposal-versioned",

  Activate = "activate",
  SignIn = "signin",
  SignUp = "signup",
  ForgotPassword = "forgot-password",
  ResendActivation = "resend-activation",
  ResetPassword = "reset-password",
  InvitedSignup = "invited-signup",
}

const routes: Array<any> = [
  // Logged-in routes
  {
    name: Routes.Home,
    path: "/",
    canActivate: loggedInRequired,
    onActivate: () => rootStore.dashboardStore.fetchData(),
  },
  {
    name: Routes.SettingsAccount,
    path: "/settings/account",
    canActivate: loggedInRequired,
    onActivate: () => rootStore.companyStore.fetchUs(),
  },
  {
    name: Routes.SettingsTeam,
    path: "/settings/team",
    canActivate: loggedInRequired,
    onActivate: () => rootStore.companyStore.fetchUs(),
  },
  {
    name: Routes.SettingsCompany,
    path: "/settings/company",
    canActivate: loggedInRequired,
    onActivate: () => rootStore.companyStore.fetchUs(),
  },
  {
    name: Routes.SettingsClients,
    path: "/settings/clients",
    canActivate: loggedInRequired,
    onActivate: () => Promise.all([rootStore.companyStore.fetchUs(), rootStore.clientStore.fetchAll()]),
  },
  {
    name: Routes.SettingsBranding,
    path: "/settings/branding",
    canActivate: loggedInRequired,
    onActivate: () => rootStore.companyStore.fetchUs(),
  },
  {
    name: Routes.SettingsBilling,
    path: "/settings/billing",
    canActivate: loggedInRequired,
    onActivate: () => rootStore.companyStore.fetchUs(),
  },
  {
    name: Routes.SettingsIntegration,
    path: "/settings/integration",
    canActivate: loggedInRequired,
    onActivate: () => rootStore.companyStore.fetchUs(),
  },
  {
    name: Routes.Editor,
    path: "/proposals/:id",
    canActivate: loggedInRequired,
    onActivate: (params: any) => rootStore.proposalStore.fetchOne(params.id),
  },
  {
    name: Routes.Analytics,
    path: "/analytics/:id",
    canActivate: loggedInRequired,
    onActivate: (params: any) => rootStore.analyticsStore.fetchData(params.id),
  },
  {
    name: Routes.PublishSettings,
    path: "/publish/:id",
    canActivate: loggedInRequired,
    onActivate: (params: any) => Promise.all([
      rootStore.proposalStore.fetchOne(params.id),
      rootStore.clientStore.fetchAll(),
      rootStore.clientStore.fetchIntegrationContacts(),
    ]),
  },

  {
    name: Routes.Preview,
    path: "/preview/:id",
    canActivate: loggedInRequired,
    onActivate: (params: any) => rootStore.proposalStore.fetchOne(params.id),
  },
  {
    name: Routes.Proposal,
    path: "/p/:shareUid",
    onActivate: (params: any) => rootStore.sharedStore.fetchOne(params.shareUid, params.version),
  },
  {
    name: Routes.ProposalVersioned,
    path: "/p/:shareUid/:version",
    onActivate: (params: any) => rootStore.sharedStore.fetchOne(params.shareUid, params.version),
  },

  // Logged-out routes
  {name: Routes.SignIn, path: "/signin", canActivate: loggedOutRequired},
  {name: Routes.SignUp, path: "/signup", canActivate: loggedOutRequired},
  {name: Routes.ForgotPassword, path: "/forgot", canActivate: loggedOutRequired},
  {name: Routes.ResendActivation, path: "/resend", canActivate: loggedOutRequired},
  {name: Routes.ResetPassword, path: "/reset-password/:token", canActivate: loggedOutRequired},
  {name: Routes.InvitedSignup, path: "/invites/:token", canActivate: loggedOutRequired},
  {name: Routes.Activate, path: "/activate/:token", canActivate: loggedOutRequired},
];


// Router setup
const router = createRouter(routes);
router.usePlugin(browserPlugin({}), mobxRouterPlugin as any);
router.useMiddleware(asyncMiddleware(routes));
router.start();


export default router;
