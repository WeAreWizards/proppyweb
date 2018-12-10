
// From http://stackoverflow.com/questions/3452546/javascript-regex-how-to-get-youtube-video-id-from-url
const youtubeRegex = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;

export function getEmbedUrl(url: string): any {
  if (url.indexOf("https://www.youtube.com") === 0) {
    const youtubeId = url.match(youtubeRegex)[1];
    return `https://www.youtube.com/embed/${youtubeId}`;
  }
  if (url.indexOf("https://youtu.be") === 0) {
    const youtubeId = url.replace("https://youtu.be/", "");
    return `https://www.youtube.com/embed/${youtubeId}`;
  }
  if (url.indexOf("https://vimeo.com") === 0) {
    const parts = url.split("/");
    const vimeoId = parts[parts.length - 1];
    return `https://player.vimeo.com/video/${vimeoId}`;
  }
  return url;
}


// Taken from https://github.com/kevva/url-regex
export function isUrl(input: string): boolean {
  const protocol = "(?:(?:[a-z]+:)?//)";
  const auth = "(?:\\S+(?::\\S*)?@)?";
  const host = "(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)";
  const domain = "(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*";
  const tld = "(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))";
  const port = "(?::\\d{2,5})?";
  const path = "(?:[/?#]\\S*)?";
  const regex = [
    protocol,
    auth,
    "(?:localhost|" + host + domain + tld + ")",
    port,
    path,
  ].join("");

  const reg = new RegExp("(?:^" + regex + "$)", "i");
  return reg.test(input);
}
