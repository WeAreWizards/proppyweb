import * as uuid from "uuid";


export function getToken() {
  try {
    return localStorage.getItem("jwt");
  } catch (e) {
    // tslint:disable-next-line
    console.error("localStorage failed unexpectedly: ", e);
    return null;
  }
}

export function getUserId(): number {
  const token = getToken();
  if (token === null) {
    return null;
  }
  const claims = token.split(".")[1];
  return JSON.parse(window.atob(claims)).user;
}

// Gets the company name from the given token, used with an invite token
// to display which company invited the user
export function getCompanyName(token) {
  try {
    return JSON.parse(window.atob(token.split(".")[1])).companyName;
  } catch (e) {
    return null;
  }
}

export function isLoggedIn() {
  return getToken() !== null;
}

export function setToken(token: string) {
  localStorage.setItem("jwt", token);
}

export function clearToken() {
  localStorage.removeItem("jwt");
}

export function needsAnonymousUsername() {
  return getToken() === null && getAnonymousUsername() === null;
}

export function getAnonymousUsername() {
  return localStorage.getItem("anonymousUsername");
}

export function setAnonymousUsername(name: string) {
  return localStorage.setItem("anonymousUsername", name);
}

// Set a uuid in localstorage for anon users
// Used to identify visitors for analytics
export function setAnonUid() {
  if (isLoggedIn()) {
    return;
  }

  localStorage.setItem("anonUid", uuid.v4());
}

export function getAnonUid(): string {
  if (localStorage.getItem("anonUid") === null) {
    setAnonUid();
  }
  return localStorage.getItem("anonUid");
}
