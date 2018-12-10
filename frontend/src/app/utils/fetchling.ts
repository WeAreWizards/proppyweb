// Heavily inspired by fetchival
// https://github.com/typicode/fetchival

import {getToken} from "../utils/auth";
import {IHTTPError, UIError} from "../interfaces";
import rootStore from "../stores/RootStore";


declare var __API_BASE_URL__: string;

function _fetch(method: string, url: string, options: any, data: any, queryParams: any, isFileUpload = false) {
  let finalUrl = __API_BASE_URL__ + url;
  options.method = method;
  options.headers = options.headers || {};
  options.headers.Accept = "application/json";
  // no contenttype for file upload, else it fails
  if (!isFileUpload) {
    options.headers["Content-Type"] = "application/json";
  }

  const token = getToken();
  if (token !== null) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  if (data) {
    options.body = isFileUpload ? data : JSON.stringify(data);
  }

  if (queryParams) {
    const params = Object.keys(queryParams).map(key => {
      return [key, encodeURIComponent(queryParams[key])].join("=");
    });
    finalUrl += "?" + params.join("&");
  }

  return window.fetch(finalUrl, options)
    .then(response => {
      // 401 are allowed on login
      if (url !== "/tokens" && response.status === 401) {
        rootStore.userStore.logout();
        return;
      }

      const json = response.json();
      if (response.status >= 200 && response.status < 300) {
        return json;
      }

      if (response.status === 402) {
        json.then((errData) => { rootStore.uiStore.showNeedHigherPlanError(errData.publishState); });
      } else if (response.status === 403) {
        rootStore.uiStore.setUiError(UIError.UNAUTHORIZED);
      } else if (response.status === 404) {
        rootStore.uiStore.setUiError(UIError.NOT_FOUND);
      } else if (response.status === 500) {
        rootStore.uiStore.setUiError(UIError.INTERNAL_ERROR);
      }
      // Very brittle but seems to be consistent
      // left is chrome, right is firefox
      // We could also filter on error.name && error.name === "TypeError" but
      if (response.statusText === "Failed to fetch" || response.statusText === "NetworkError when attempting to fetch resource.") {
        rootStore.uiStore.setUiError(UIError.NETWORK_PROBLEM);
      }

      return json.then(errors => {
        const err = <IHTTPError> new Error(response.statusText);
        err.response = response;
        err.errors = errors;
        throw err;
      });
    });
}

// Helper around fetch
export default function fetchling(url: string, options: object = {}) {
  return {
    get: (queryParams?: object) => {
      return _fetch("GET", url, options, null, queryParams);
    },

    post: (data?: object) => {
      return _fetch("POST", url, options, data, null);
    },

    put: (data: object) => {
      return _fetch("PUT", url, options, data, null);
    },

    patch: (data: object) => {
      return _fetch("PATCH", url, options, data, null);
    },

    delete: () => {
      return _fetch("DELETE", url, options, null, null);
    },

    upload: (data: object) => {
      return _fetch("POST", url, options, data, null, true);
    },
  };
}
