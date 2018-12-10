import {observable, computed, action, ObservableMap} from "mobx";

import fetchling from "../utils/fetchling";
import {getUserId, setToken, clearToken} from "../utils/auth";
import { User } from "./models/User";
import {Store} from "./RootStore";


export class UserStore extends Store {
  @observable users: ObservableMap<User> = new ObservableMap<User>();
  @observable me: User | null = null;

  @action setUser(data: any) {
    const user = new User(data);
    this.users.set(user.id.toString(), user);
  }

  @action setUsers(data: Array<any>) {
    this.users.clear();
    data.map(u => this.setUser(u));
    this.setMe();
  }

  @action login(data: any) {
    setToken(data.loginToken);
    this.setUser(data);
    this.setMe();
  }

  logout() {
    clearToken();
    // Force reload to clear all the model data. Clearing the data in
    // the reducers is too risky: We will always forget something.
    window.location.reload(true);
  }

  // Return promise for InAppForm
  @action inviteUser(data: any): Promise<any> {
    return fetchling("/invites").post(data)
      .then((response: any) => {
        this.setUser(response.user);
        this.rootStore.uiStore.notify(`${data.email} was invited to Proppy`, false);
      })
      .catch(response => {
        this.rootStore.uiStore.notify(`Could not invite ${data.email}. Please try again later`, true);
        if (response.errors) {
          throw response;
        }
      });
  }

  @action resendInviteEmail(email: string) {
    fetchling("/resend-invite").post({email})
      .then(() => this.rootStore.uiStore.notify("Re-sent invitation email to " + email, false))
      .catch(() => this.rootStore.uiStore.notify("Could not send invitation email to " + email + ". Please try again in a bit.", true));
  }

  @action resendActivationEmail(email: string) {
    fetchling("/resend-activation-email").post({email})
      .then(() => this.rootStore.uiStore.notify("Re-sent activation email to " + email, false))
      .catch(() => this.rootStore.uiStore.notify("Could not send activation email to " + email + ". Please try again in a bit.", true));
  }

  // Return promise for InAppForm
  @action updatePassword(data: any): Promise<any> {
    return fetchling("/users/update-password").post(data)
      .then(() => this.rootStore.uiStore.notify(`Password updated.`, false))
      .catch(response => {
        this.rootStore.uiStore.notify(`Could not update password. Please try again in a bit.`, true);
        if (response.errors) {
          throw response;
        }
      });
  }

  // Return promise for InAppForm
  @action updateAccount(data: any): Promise<any> {
    return fetchling("/users/update-account").post(data)
      .then((response: any) => {
        this.setUser(response.user);
        this.setMe();
        this.rootStore.uiStore.notify(`Account details updated.`, false);
      })
      .catch(response => {
        this.rootStore.uiStore.notify(`Could not update account details. Please try again in a bit.`, true);
        if (response.errors) {
          throw response;
        }
      });
  }

  @action disableUser(userId: number) {
    const user = this.getUser(userId);
    fetchling(`/disable-user/${userId}`).post({})
      .then((response: any) => {
        this.setUser(response.user);
        this.rootStore.uiStore.notify(`${user.getNameAndEmail()} disabled`, false);
      })
      .catch(() => this.rootStore.uiStore.notify(`Could not disable ${user.getNameAndEmail()}.Please try again in a bit.`, true));
  }

  @action enableUser(userId: number) {
    const user = this.getUser(userId);
    fetchling(`/enable-user/${userId}`).post({})
      .then((response: any) => {
        this.setUser(response.user);
        this.rootStore.uiStore.notify(`${user.getNameAndEmail()} enabled`, false);
      })
      .catch(() => this.rootStore.uiStore.notify(`Could not enable ${user.getNameAndEmail()}.Please try again in a bit.`, true));
  }

  @action toggleUserAdmin(userId: number) {
    const user = this.getUser(userId);

    fetchling(`/toggle-user-admin/${userId}`).post({})
      .then((response: any) => {
        const message = user.isAdmin
          ? `${user.getNameAndEmail()} is not an admin anymore`
          : `${user.getNameAndEmail()} is now an admin`;
        this.rootStore.uiStore.notify(message, false);
        this.setUser(response.user);
      })
      .catch(() => this.rootStore.uiStore.notify(`Could not change ${user.getNameAndEmail()} status. Please try again in a bit.`, true));
  }

  @action onboardingDone() {
    fetchling(`/finish-onboarding`).post({});
  }

  getUser(userId: number): User | null {
    if (userId === null) {
      return null;
    }
    return this.users.get(userId.toString());
  }

  // not @computed as it doesn't recompute when setting things in localstorage
  @action setMe() {
    this.me = this.getUser(getUserId());
  }

  @computed get numberUsers(): number {
    return this.users.size;
  }

  @computed get numberAdminUsers(): number {
    return this.users.values().filter(u => u.isAdmin).length;
  }
}
