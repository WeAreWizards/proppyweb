import * as chai from "chai";
const expect = chai.expect;

import { getEmbedUrl } from "../../app/utils/embed";


describe("Embed utils:", () => {
  describe("getEmbedUrl:", () => {
    it("should recognize youtube links", () => {
      const result = getEmbedUrl("https://www.youtube.com/watch?v=S9bCLPwzSC0");
      expect(result).to.equal("https://www.youtube.com/embed/S9bCLPwzSC0");
    });

    it("should recognize shortened youtube links", () => {
      const result = getEmbedUrl("https://youtu.be/S9bCLPwzSC0");
      expect(result).to.equal("https://www.youtube.com/embed/S9bCLPwzSC0");
    });

    it("should recognize vimeo links", () => {
      const result = getEmbedUrl("https://vimeo.com/138790270");
      expect(result).to.equal("https://player.vimeo.com/video/138790270");
    });
  });
});
