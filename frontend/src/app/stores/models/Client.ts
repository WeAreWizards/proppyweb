

export class Client {
  public id: number;
  public name: string;
  public source: string;

  constructor(json: any) {
    Object.assign(this, json);
  }
}


export interface IntegrationContact {
  name: string;
  email: string;
  sourceId: string;
  companyName?: string;
  companyId?: string;
}

export interface IntegrationContacts {
  pipedrive: Array<IntegrationContact>;
  zohocrm: Array<IntegrationContact>;
  insightly: Array<IntegrationContact>;
}
