import { observable, action, ObservableMap } from "mobx";


import { Client, IntegrationContacts } from "./models/Client";
import fetchling from "../utils/fetchling";
import {Store} from "./RootStore";


export class ClientStore extends Store {
  @observable clients: ObservableMap<Client> = new ObservableMap<Client>();
  @observable contacts: IntegrationContacts = {
    pipedrive: [],
    zohocrm: [],
    insightly: [],
  };

  setClients(data: Array<any>) {
    this.clients.clear();
    data.map(c => this.setClient(c));
  }

  setClient(data: any) {
    const c = new Client(data);
    this.clients.set(c.id.toString(), c);
  }

  getClient(id: number | string) {
    return this.clients.get(id.toString());
  }

  getContactsFrom(source: string): Array<any> {
    return this.contacts[source];
  }

  @action fetchAll(): Promise<any> {
    return fetchling("/clients").get().then(action((response: any) => {
      this.setClients(response.clients);
    }));
  }

  @action fetchIntegrationContacts(): Promise<any> {
    return fetchling("/integration_contacts").get()
      .then(action((response: any) => {
          this.contacts = response.contacts;
      }));
  }

  @action createClient(data: any) {
    return fetchling(`/clients`).post(data)
      .then((response: any) => {
        this.clients.set(response.client.id.toString(), new Client(response.client));
        this.rootStore.uiStore.notify(`Client added`, false);
      })
      .catch(response => {
        this.rootStore.uiStore.notify(`Client could not be added. Please try again later`, true);
        if (response.errors) {
          return response.errors.errors;
        }
      });
  }

  @action deleteClient(clientId: number) {
    const client = this.clients.get(clientId.toString());
    return fetchling(`/clients/${clientId}`).delete()
      .then(() => {
        this.clients.delete(clientId.toString());
        this.rootStore.uiStore.notify(`Client deleted`, false);
      })
      .catch(() => this.rootStore.uiStore.notify(`Client ${client.name} could not be deleted. Please try again later`, false));
  }

  @action updateClient(clientId: number, name: string) {
    return fetchling(`/clients/${clientId}`).put({name})
      .then((response: any) => {
        this.clients.set(clientId.toString(), new Client(response.client));
        this.rootStore.uiStore.notify(`Client updated`, false);
      })
      .catch(response => {
        this.rootStore.uiStore.notify(`Client could not be updated. Please try again later`, true);
        if (response.errors) {
          return response.errors.errors;
        }
      });
  }
}
