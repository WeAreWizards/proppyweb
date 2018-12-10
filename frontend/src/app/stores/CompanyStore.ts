import {observable, action, computed} from "mobx";

import { Company, IBranding } from "./models/Company";
import fetchling from "../utils/fetchling";
import {Store} from "./RootStore";


export class CompanyStore extends Store {
  @observable us: Company | null = null;

  @action fetchUs(): Promise<any> {
    return fetchling("/companies/us").get()
      .then(action((response: any) => {
          this.us = new Company(response.company);
          this.rootStore.userStore.setUsers(response.users);
          this.rootStore.billingStore.setSubscription(response.subscription);
      }));
  }

  @action setUs(data: any) {
    this.us = new Company(data);
  }

  @action updateUs(data: any): Promise<any> {
    return fetchling("/companies/us").post(data)
      .then((response: any) => {
        this.us = new Company(response.company);
        this.rootStore.uiStore.notify(`Company details updated.`, false);
      })
      .catch(response => {
        this.rootStore.uiStore.notify(`Could not update company details. Please try again in a bit.`, true);
        if (response.errors) {
          return response.errors.errors;
        }
      });
  }

  @action updateLogo(logoUrl: string): Promise<any> {
    return fetchling("/companies/us").put({logoUrl})
      .then((response: any) => {
        this.us = new Company(response.company);
        this.rootStore.uiStore.notify(`${logoUrl === "" ? "Removed" : "Updated"} company logo`, false);
      })
      .catch(() => {
        this.rootStore.uiStore.notify(`Could not ${logoUrl === "" ? "remove" : "update"} company logo. Please try again in a bit.`, true);
      });
  }

  @action updateBranding(branding: IBranding) {
    return fetchling("/companies/branding").post({branding})
      .then((response: any) => {
        this.us = new Company(response.company);
        this.rootStore.uiStore.notify(`Company branding updated.`, false);
      })
      .catch(() => {
        this.rootStore.uiStore.notify(`Could not update company branding. Please try again in a bit.`, true);
      });
  }

  @action updateSlackEvents(postOnView, postOnComment, postOnSignature) {
    fetchling("/slack_oauth").put({postOnView, postOnComment, postOnSignature})
      .then((response: any) => {
        this.us = new Company(response.company);
        this.rootStore.uiStore.notify(`Slack integration updated.`, false);
      })
      .catch(() => {
        this.rootStore.uiStore.notify(`Could not update Slack integration. Please try again in a bit.`, true);
      });
  }

  @action disableStripeIntegration() {
    fetchling("/stripe_oauth").delete()
      .then((response: any) => {
        this.us = new Company(response.company);
        this.rootStore.uiStore.notify(`Stripe integration disabled.`, false);
      })
      .catch(() => {
        this.rootStore.uiStore.notify(`Could not disable Stripe integration. Please try again in a bit.`, true);
      });
  }

  @action disableSlackIntegration() {
    fetchling("/slack_oauth").delete()
      .then((response: any) => {
        this.us = new Company(response.company);
        this.rootStore.uiStore.notify(`Slack integration disabled.`, false);
      })
      .catch(() => {
        this.rootStore.uiStore.notify(`Could not disable Slack integration. Please try again in a bit.`, true);
      });
  }
  // actions for all integrations that just gives a token (no oauth)
  @action addIntegrationToken(name: string,  token: string): Promise<any> {
    return fetchling("/add_integration_token").post({name: name.toLowerCase(), token})
      .then((response: any) => {
        this.us = new Company(response.company);
        this.rootStore.uiStore.notify(`${name} integration enabled.`, false);
      })
      .catch(() => {
        this.rootStore.uiStore.notify(`Could not enable ${name} integration. Please try again in a bit.`, true);
      });
  }

  @action removeIntegrationToken(name: string) {
    fetchling("/remove_integration_token").post({name: name.toLowerCase()})
      .then((response: any) => {
        this.us = new Company(response.company);
        this.rootStore.uiStore.notify(`${name} integration disabled and contacts deleted.`, false);
      })
      .catch(() => {
        this.rootStore.uiStore.notify(`Could not disable ${name} integration. Please try again in a bit.`, true);
      });
  }

  @computed get hasPaymentIntegration() {
    return this.us.integrations.stripe !== null;
  }

  @action enableZapierIntegration() {
    return fetchling(`/zapier/api_key`).post()
      .then((response: any) => {
        this.us = new Company(response.company);
      }).catch(() => {
        this.rootStore.uiStore.notify(`Could not create an API key, please try again in a bit.`, true);
      });
  }

  @action disableZapierIntegration() {
    if (!window.confirm(`Disabling Zapier means you will need to re-connecy your Zapps after. Are you sure?`)) {
      return;
    }
    return fetchling(`/zapier/api_key`).delete()
      .then((response: any) => {
        this.us = new Company(response.company);
      }).catch(() => {
        this.rootStore.uiStore.notify(`Could not disable the Zapier integration, please try again in a bit.`, true);
      });
  }
}
