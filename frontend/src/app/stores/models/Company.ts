export interface IBranding {
  fontHeaders: string;
  fontBody: string;
  primaryColour: string;
  bgColour: string;
  textColour: string;
}

export const DEFAULT_BRANDING = {
  fontHeaders: "Lato",
  fontBody: "ff-tisa-web-pro",
  primaryColour: "#40C181",
  bgColour: "#fff",
  textColour: "#454B4F",
};



interface IIntegrations {
  slack?: {
    teamName: string;
    channel: string;
    webhookUrl: string;
    postOnView: boolean;
    postOnComment: boolean;
    postOnSignature: boolean;
  };
  zohocrm: boolean;
  insightly: boolean;
  pipedrive: boolean;
  stripe?: {
    stripe_publishable_key: string;
    access_token: string;
  };
  zapier?: {
    apiKey: string;
  };
}


export class Company {
  public id: number;
  public name: string;
  public logoUrl: string | null;
  public whitelabelDomain: string | null;
  public currency: string;
  public branding: IBranding;
  public integrations: IIntegrations;

  constructor(data: any) {
    Object.assign(this, data);
  }
}
