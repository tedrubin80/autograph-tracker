# Playwright's own image ships Chromium plus every system library it needs
# already baked into this layer. A Railpack/Nixpacks build installs those
# libs during the *build* stage only, which doesn't carry over to the
# separate runtime container — that's what crashed the first deploy
# (`libglib-2.0.so.0: cannot open shared object file`). This sidesteps that
# entirely by using an image where the runtime layer already has them.
#
# Keep this tag in exact sync with the `playwright` version pinned (no
# caret) in package.json — a mismatch makes `npm install`'s postinstall
# fetch a different browser revision than the one this image's system
# libraries were installed for, which crashes at launch with something like
# "libglib-2.0.so.0: cannot open shared object file" despite the image
# nominally having Playwright's dependencies.
FROM mcr.microsoft.com/playwright:v1.49.1-noble

# Belt-and-suspenders: this should already be set by the base image, but
# make it explicit so `npm install` recognizes the browser already on disk
# here instead of re-downloading a possibly-mismatched build.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY scrape.mjs ./

CMD ["node", "scrape.mjs"]
