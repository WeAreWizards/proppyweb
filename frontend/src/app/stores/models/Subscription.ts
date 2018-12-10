

export class Subscription {
  plan: string | null = null;
  status: "future" | "in_trial" | "active" | "non_renewing" | "cancelled" | "not-loaded" = "not-loaded";
  trialEnd: number = 0;
  trialHasEnded: boolean = false;
  cardStatus: "valid" | "expiring" | "expired" | "not-loaded" = "not-loaded";
  isChargebeeSubscription: boolean = false;
  cardType: "visa" | "mastercard" | "american_express" | "discover" | "jcb" | "diners_club" | "other" | "not-applicable" = "not-applicable";
  cardLast4: string = "";
  cardExpiry: string = "";
  canCancel: boolean = false;

  constructor(data?: any) {
    if (data) {
      Object.assign(this, data);
    }
  }

  get activePlan() {
    return this.isChargebeeSubscription ? this.plan : null;
  }
}
