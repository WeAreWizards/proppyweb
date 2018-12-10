import * as React from "react";


import FormContainer from "./FormContainer";
import TextForm from "../core/forms/TextForm";
import Link from "../core/Link";
import fetchling from "../../utils/fetchling";
import { ILoggedOutFormState } from "../../interfaces";
import rootStore from "../../stores/RootStore";
import router, {Routes} from "../../routes";


declare var __PRODUCTION__: boolean;
declare var __MIXPANEL_TOKEN__: boolean;
declare var ga: any;
declare var mixpanel: any;

/* tslint:disable */
const GA_SNIPPET = `
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-57056653-3', 'auto', {'allowLinker': true});
  ga('send', 'pageview');
  ga('require', 'linker');
  ga('linker:autoLink', ['proppy.io', 'app.proppy.io'] );
`;

// Modified the snippet a bit to automatically pick the //cdn source for the script
// as the original line was failing when injected from React for some reasons
const MIXPANEL_SNIPPET = `
(function(e,a){if(!a.__SV){var b=window;try{var c,l,i,j=b.location,g=j.hash;c=function(a,b){return(l=a.match(RegExp(b+"=([^&]*)")))?l[1]:null};g&&c(g,"state")&&(i=JSON.parse(decodeURIComponent(c(g,"state"))),"mpeditor"===i.action&&(b.sessionStorage.setItem("_mpcehash",g),history.replaceState(i.desiredHash||"",e.title,j.pathname+j.search)))}catch(m){}var k,h;window.mixpanel=a;a._i=[];a.init=function(b,c,f){function e(b,a){var c=a.split(".");2==c.length&&(b=b[c[0]],a=c[1]);b[a]=function(){b.push([a].concat(Array.prototype.slice.call(arguments,
0)))}}var d=a;"undefined"!==typeof f?d=a[f]=[]:f="mixpanel";d.people=d.people||[];d.toString=function(b){var a="mixpanel";"mixpanel"!==f&&(a+="."+f);b||(a+=" (stub)");return a};d.people.toString=function(){return d.toString(1)+".people (stub)"};k="disable time_event track track_pageview track_links track_forms register register_once alias unregister identify name_tag set_config reset people.set people.set_once people.increment people.append people.union people.track_charge people.clear_charges people.delete_user".split(" ");
for(h=0;h<k.length;h++)e(d,k[h]);a._i.push([b,c,f])};a.__SV=1.2;b=e.createElement("script");b.type="text/javascript";b.async=!0;b.src="//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";c=e.getElementsByTagName("script")[0];c.parentNode.insertBefore(b,c)}})(document,window.mixpanel||[]);
mixpanel.init("${__MIXPANEL_TOKEN__}");
`;
/* tslint:enable */

function getQueryParam(param: any): string {
    param = param.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    const regexS = "[\\?&]" + param + "=([^&#]*)";
    const regex = new RegExp(regexS);
    const results = regex.exec(document.URL);
    if (results === null || (results && typeof(results[1]) !== "string" && results[1].length)) {
        return "";
    } else {
        return decodeURIComponent(results[1]).replace(/\+/g, " ");
    }
}

export class SignupRoute extends React.Component<{}, ILoggedOutFormState> {
  inputs: any;

  constructor(props: any) {
    super(props);
    this.state = {disabledForSubmit: false, errors: null, submitted: false};
    this.inputs = {
      username: {
        type: "text",
        label: "Username",
      },
      companyName: {
        type: "text",
        label: "Company Name",
      },
      email: {
        type: "email",
        label: "Email",
      },
      password: {
        type: "password",
        label: "Password",
        note: "Minimum 8 characters",
        minLength: 8,
      },
    };
    this.submit = this.submit.bind(this);
  }

  componentDidMount() {
    document.title = `Proppy - Signup`;
    const gaNode = document.getElementById("ga-analytics");
    if (!gaNode && __PRODUCTION__) {
      const script = document.createElement("script");
      script.id = "ga-analytics";
      script.text = GA_SNIPPET;
      document.body.appendChild(script);
    }
    const mixpanelNode = document.getElementById("mixpanel-analytics");
    // TODO: restrict mixpanel to prod once it's working.
    if (!mixpanelNode && __PRODUCTION__) {
      const script = document.createElement("script");
      script.id = "mixpanel-analytics";
      script.text = MIXPANEL_SNIPPET;
      document.body.appendChild(script);
    }
  }

  componentWillUnmount() {
    const gaNode = document.getElementById("ga-analytics");
    if (gaNode) {
      document.body.removeChild(gaNode);
    }
    const mixpanelNode = document.getElementById("mixpanel-analytics");
    if (mixpanelNode) {
      document.body.removeChild(mixpanelNode);
    }
  }

  componentWillUpdate(nextProps, nextState) {
    if (nextState.submitted) {
      router.navigate("home");
    }
  }

  submit(data: any) {
    const { username, email, password, companyName } = data;
    const search = window.location.search;
    this.setState({disabledForSubmit: true});

    fetchling("/users").post({username, email, password, companyName, utm_source: search})
      .then((payload: any) => {
        const distinctId = getQueryParam("mid");
        rootStore.userStore.login(payload.user);
        this.setState({submitted: true, errors: null, disabledForSubmit: false});
        if (window["ga"]) {
          ga("send", {
            hitType: "event",
            eventCategory: "Signup",
            eventAction: "done",
          });
        }

        if (window["mixpanel"]) {
          if (distinctId) {
            mixpanel.identify(distinctId);
            try {
              mixpanel.alias(payload.user.company_id);
            } catch (err) {
              // it will error if we re-alias someone we already had (double signup)
              // do nothing in that case
            }
            mixpanel.track("User signed up");
            mixpanel.people.set({
              companyId: payload.user.company_id,
              companyName,
            });
          }
        }
      })
      .catch(err => {
        if (err.errors) {
          this.setState({errors: err.errors.errors, disabledForSubmit: false});
        }
      });
  }

  render() {
    return (
      <div className="signup-page">
        <FormContainer title="Sign up">
          <p>Proppy is shutting down on December 1st 2018.</p>
          <TextForm
            errors={this.state.errors}
            disabledForSubmit={this.state.disabledForSubmit}
            inputs={this.inputs}
            onSubmit={this.submit}
            submitText="Sign up" />
          <p><Link to={Routes.SignIn}>I have an account, sign in</Link></p>
        </FormContainer>
      </div>
    );
  }
}

export default SignupRoute;
