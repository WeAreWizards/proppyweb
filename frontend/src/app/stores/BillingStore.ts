import { observable, action } from "mobx";

import { Subscription } from "./models/Subscription";
import fetchling from "../utils/fetchling";
import {Store} from "./RootStore";


const PAYMENT_ERROR_MSG = "Payment error. Please contact team@proppy.io";

export class BillingStore extends Store {
  @observable sub: Subscription = new Subscription();

  @action setSubscription(data: any) {
    this.sub = new Subscription(data);
  }

  @action changePlan(plan: string): Promise<any> {
    return fetchling("/chargebee-change-plan").post({ plan })
      .then((response: any) => {
        return this.fetchSubSync().then(() => {
          this.rootStore.uiStore.notify("Successfully changed plan", false);
        });
      })
      .catch((response: any) => {
        const errorMessage = response.errors.errors.error || PAYMENT_ERROR_MSG;
        this.rootStore.uiStore.notify(errorMessage, true);
      });
  }

  @action fetchSubSync(): Promise<any> {
    return fetchling("/chargebee-fetch-subscription-sync").get()
      .then((response: any) => this.setSubscription(response.subscription))
      .catch((response: any) => {
        const errorMessage = response.errors.errors.error || PAYMENT_ERROR_MSG;
        this.rootStore.uiStore.notify(errorMessage, true);
      });
  }

  @action getNewPaymentPage(plan: string): Promise<any> {
    return fetchling("/chargebee-new-hosted-page").post({plan})
      .then((response: any) => response)
      .catch((response: any) => {
        const errorMessage = response.errors.errors.error || PAYMENT_ERROR_MSG;
        this.rootStore.uiStore.notify(errorMessage, true);
      });
  }

  @action getUpdatePaymentPage(): Promise<any> {
    return fetchling("/chargebee-update-hosted-page").post({})
      .then((response: any) => response)
      .catch((response: any) => {
        const errorMessage = response.errors.errors.error || PAYMENT_ERROR_MSG;
        this.rootStore.uiStore.notify(errorMessage, true);
      });
  }

  @action getInvoices(): Promise<any> {
    return fetchling("/chargebee-get-invoices").get()
      .then((response: any) => {
        return response.invoices;
      })
      .catch(() => this.rootStore.uiStore.notify("Could not get invoices. Please try again later", true));
  }

  @action getInvoicePDF(invoiceId: string): Promise<any> {
    return fetchling("/chargebee-download-invoice").post({ invoiceId })
      .then((response: any) => {
        window.open(response.url, "_blank");
      })
      .catch(() => this.rootStore.uiStore.notify("Could not download the invoice. Please try again later", true));
  }

  @action cancel(feedback): Promise<any> {
    return fetchling("/chargebee-cancel").post({feedback})
      .then((response: any) => {
        this.setSubscription(response.subscription);
        this.rootStore.uiStore.notify("Subscription cancelled. Sorry to see you go :(", false);
      })
      .catch(() => this.rootStore.uiStore.notify("Could not cancel the subscribption. Please email us at team@proppy.io", true));
  }
}

