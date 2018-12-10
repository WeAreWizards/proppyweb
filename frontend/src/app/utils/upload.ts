import fetchling from "./fetchling";
import { UploadPurpose } from "../interfaces";
import rootStore from "../stores/RootStore";


export function upload(data, purpose: UploadPurpose): Promise<any> {
  return fetchling("/upload/" + purpose).upload(data)
    .catch(err => {
      if (err.response && err.response.status === 413) {
        rootStore.uiStore.notify("The uploaded file is too large. Please try a smaller one.", true);
      } else {
        rootStore.uiStore.notify("Image upload failed. Please try again later.", true);
      }
      // TODO - do we want to re-throw the error?
    });
}
